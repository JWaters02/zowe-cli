/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*
*/

import * as spawn from "cross-spawn";
import * as jsonfile from "jsonfile";
import * as npmPackageArg from "npm-package-arg";
import * as pacote from "pacote";
import * as npmFunctions from "../../../src/plugins/utilities/NpmFunctions";
import { PMFConstants } from "../../../src/plugins/utilities/PMFConstants";
import { DaemonRequest, ExecUtils, ImperativeConfig } from "../../../../utilities";

jest.mock("cross-spawn");
jest.mock("jsonfile");
jest.mock("pacote");

describe("NpmFunctions", () => {
    const fakeRegistry = "http://localhost:4873/";
    const npmCmd = npmFunctions.findNpmOnPath();

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it("installPackages should run npm install command", () => {
        const stdoutBuffer = Buffer.from("Install Succeeded");
        jest.spyOn(PMFConstants, "instance", "get").mockReturnValueOnce({ PMF_ROOT: __dirname } as any);
        const spawnSyncSpy = jest.spyOn(spawn, "sync").mockReturnValueOnce({
            status: 0,
            stdout: stdoutBuffer
        } as any);
        const result = npmFunctions.installPackages("samplePlugin", { prefix: "fakePrefix", registry: fakeRegistry });
        expect(spawnSyncSpy.mock.calls[0][0]).toBe(npmCmd);
        expect(spawnSyncSpy.mock.calls[0][1]).toEqual(expect.arrayContaining(["install", "samplePlugin"]));
        expect(spawnSyncSpy.mock.calls[0][1]).toEqual(expect.arrayContaining(["--prefix", "fakePrefix"]));
        expect(spawnSyncSpy.mock.calls[0][1]).toEqual(expect.arrayContaining(["--registry", fakeRegistry]));
        expect(result).toBe(stdoutBuffer.toString());
    });
    it("should write output to daemon stream if available", () => {
        const writeMock = jest.fn().mockReturnValue("true");

        jest.spyOn(ImperativeConfig, "instance", "get").mockReturnValue({
            envVariablePrefix: "MOCK_PREFIX",
            cliHome: "/mock/home",
            daemonContext: {
                stream: {
                    write: writeMock
                }
            }
        } as any);

        jest.spyOn(ExecUtils, "spawnAndGetOutput").mockReturnValue(Buffer.from("Install Succeeded"));
        const result = npmFunctions.installPackages("samplePlugin", { prefix: "fakePrefix" });
        expect(writeMock).toHaveBeenCalledWith(DaemonRequest.create({ stderr: "Install Succeeded" }));
        expect(result).toBe("true");
    });

    it("getRegistry should run npm config command", () => {
        const stdoutBuffer = Buffer.from(fakeRegistry);
        const spawnSyncSpy = jest.spyOn(spawn, "sync").mockReturnValueOnce({
            status: 0,
            stdout: stdoutBuffer
        } as any);
        const result = npmFunctions.NpmRegistryUtils.getRegistry();
        expect(spawnSyncSpy.mock.calls[0][0]).toBe(npmCmd);
        expect(spawnSyncSpy.mock.calls[0][1]).toEqual(["config", "get", "registry"]);
        expect(result).toBe(stdoutBuffer.toString());
    });

    it("npmLogin should run npm login command", () => {
        const spawnSyncSpy = jest.spyOn(spawn, "sync").mockReturnValueOnce({ status: 0 } as any);
        npmFunctions.NpmRegistryUtils.npmLogin(fakeRegistry);
        expect(spawnSyncSpy.mock.calls[0][0]).toBe(npmCmd);
        expect(spawnSyncSpy.mock.calls[0][1]).toContain("login");
        expect(spawnSyncSpy.mock.calls[0][1]).toEqual(expect.arrayContaining(["--registry", fakeRegistry]));
    });

    describe("getPackageInfo", () => {
        const expectedInfo = { name: "@zowe/imperative", version: "latest" };

        beforeAll(() => {
            jest.spyOn(jsonfile, "readFileSync").mockResolvedValue(expectedInfo);
            jest.spyOn(pacote, "manifest").mockResolvedValue(expectedInfo as any);
        });

        it("should fetch info for package installed from registry 1", async () => {
            const pkgSpec = "@zowe/imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("range");

            jest.spyOn(PMFConstants, "instance", "get").mockReturnValueOnce({
                PLUGIN_HOME_LOCATION: ""
            } as any);
            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(jsonfile.readFileSync).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from registry 2", async () => {
            const pkgSpec = "@zowe/imperative@latest";
            expect(npmPackageArg(pkgSpec).type).toEqual("tag");

            jest.spyOn(PMFConstants, "instance", "get").mockReturnValueOnce({
                PLUGIN_HOME_LOCATION: ""
            } as any);
            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(jsonfile.readFileSync).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from local directory", async () => {
            const pkgSpec = "./imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("directory");

            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from local TGZ", async () => {
            const pkgSpec = "imperative.tgz";
            expect(npmPackageArg(pkgSpec).type).toEqual("file");

            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from Git URL", async () => {
            const pkgSpec = "github:zowe/imperative";
            expect(npmPackageArg(pkgSpec).type).toEqual("git");

            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("should fetch info for package installed from remote TGZ", async () => {
            const pkgSpec = "http://example.com/zowe/imperative.tgz";
            expect(npmPackageArg(pkgSpec).type).toEqual("remote");

            const actualInfo = await npmFunctions.getPackageInfo(pkgSpec);
            expect(actualInfo).toBe(expectedInfo);
            expect(pacote.manifest).toHaveBeenCalledTimes(1);
        });

        it("getScopeRegistry() should return registry for 'test' scope", () => {
            const spawnSpy = jest.spyOn(ExecUtils, "spawnAndGetOutput");
            spawnSpy.mockReturnValueOnce("https://test123.com");
            const result = (npmFunctions.NpmRegistryUtils as any).getScopeRegistry("test");
            expect(result).toBe("https://test123.com");
            expect(spawnSpy).toHaveBeenCalledTimes(1);
        });

    });
});
