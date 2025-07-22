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

/* eslint-disable jest/expect-expect */
let expectedVal: any;
let returnedVal: any;

jest.mock("cross-spawn");
jest.mock("jsonfile");
jest.mock("../../../../src/plugins/utilities/PMFConstants");
jest.doMock("path", () => {
    const originalPath = jest.requireActual("path");
    return {
        ...originalPath,
        resolve: (...paths: string[]) => {
            if (paths[0] === expectedVal) {
                return returnedVal ? returnedVal : expectedVal;
            } else {
                return originalPath.resolve(...paths);
            }
        }
    };
});

import { Console } from "../../../../../console";
import { ImperativeError } from "../../../../../error";
import { IImperativeConfig } from "../../../../src/doc/IImperativeConfig";
import { install } from "../../../../src/plugins/utilities/npm-interface";
import { IPluginJson } from "../../../../src/plugins/doc/IPluginJson";
import { IPluginJsonObject } from "../../../../src/plugins/doc/IPluginJsonObject";
import { Logger } from "../../../../../logger";
import { PMFConstants } from "../../../../src/plugins/utilities/PMFConstants";
import * as spawn from "cross-spawn";
import * as jsonfile from "jsonfile";
import * as findUp from "find-up";
import * as npmFns from "../../../../src/plugins/utilities/NpmFunctions";
import { ConfigSchema } from "../../../../../config/src/ConfigSchema";
import { PluginManagementFacility } from "../../../../src/plugins/PluginManagementFacility";
import { AbstractPluginLifeCycle } from "../../../../src/plugins/AbstractPluginLifeCycle";
import { ConfigurationLoader } from "../../../../src/ConfigurationLoader";
import { UpdateImpConfig } from "../../../../src/UpdateImpConfig";
import * as fs from "fs";
import * as path from "path";
import { gt as versionGreaterThan } from "semver";
import { ConfigUtils } from "../../../../../config";
import mockTypeConfig from "../../__resources__/typeConfiguration";
import { updateExtendersJson } from "../../../../src/plugins/utilities/npm-interface/install";
import { IExtendersJsonOpts } from "../../../../../config/src/doc/IExtenderOpts";

function setResolve(toResolve: string, resolveTo?: string) {
    expectedVal = toResolve;
    returnedVal = resolveTo;
}

describe("PMF: Install Interface", () => {
    // Objects created so types are correct.
    const pmfI = PluginManagementFacility.instance;
    const mocks = {
        installPackages: jest.spyOn(npmFns, "installPackages"),
        readFileSync: jest.spyOn(jsonfile, "readFileSync"),
        writeFileSync: jest.spyOn(jsonfile, "writeFileSync"),
        findUpSync: jest.spyOn(findUp, "sync"),
        getPackageInfo: jest.spyOn(npmFns, "getPackageInfo"),
        requirePluginModuleCallback: jest.spyOn(pmfI, "requirePluginModuleCallback"),
        loadConfiguration: jest.spyOn(ConfigurationLoader, "load"),
        addProfiles: jest.spyOn(UpdateImpConfig, "addProfiles"),
        spawnSync: jest.spyOn(spawn, "sync"),
        ConfigSchema: {
            loadSchema: jest.spyOn(ConfigSchema, "loadSchema"),
            updateSchema: jest.spyOn(ConfigSchema, "updateSchema")
        },
        ConfigUtils: {
            readExtendersJson: jest.spyOn(ConfigUtils, "readExtendersJson"),
            writeExtendersJson: jest.spyOn(ConfigUtils, "writeExtendersJson")
        }
    };

    const packageName = "a";
    const packageVersion = "1.2.3";
    const packageRegistry = "https://registry.npmjs.org/";
    const registryInfo = npmFns.NpmRegistryUtils.buildRegistryInfo(packageName, packageRegistry);

    beforeEach(() => {
        // Mocks need cleared after every test for clean test runs
        jest.clearAllMocks();
        expectedVal = undefined;
        returnedVal = undefined;

        // This needs to be mocked before running install
        jest.spyOn(Logger, "getImperativeLogger").mockReturnValue(new Logger(new Console()));

        /* Since install() adds new plugins into the value returned from
        * readFileSync(plugins.json), we must reset readFileSync to return an empty set before each test.
        */
        mocks.readFileSync.mockReturnValue({});
        mocks.findUpSync.mockReturnValue("fake_find-up_sync_result");
        mocks.ConfigUtils.readExtendersJson.mockReturnValue({
            profileTypes: {
                "zosmf": {
                    from: ["Zowe CLI"]
                }
            }
        });
        mocks.ConfigUtils.writeExtendersJson.mockImplementation();
        mocks.ConfigSchema.loadSchema.mockReturnValue([mockTypeConfig]);
        mocks.ConfigSchema.updateSchema.mockImplementation();
        mocks.loadConfiguration.mockReturnValue({ profiles: [mockTypeConfig] });
        mocks.spawnSync.mockReturnValue({
            status: 0,
            stdout: Buffer.from(`+ ${packageName}`)
        } as any);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    /**
     * Validates that an npm install call was valid based on the parameters passed.
     *
     * @param {string} expectedPackage The package that should be sent to npm install
     * @param {string} expectedRegistry The registry that should be sent to npm install
     */
    const wasNpmInstallCallValid = (expectedPackage: string, expectedRegistry: string, updateSchema?: boolean) => {
        expect(mocks.installPackages).toHaveBeenCalledWith(expectedPackage,
            { prefix: PMFConstants.instance.PLUGIN_INSTALL_LOCATION, registry: expectedRegistry }, false);
        shouldUpdateSchema(updateSchema ?? true);
    };

    /**
     * Validates that plugins install call updates the global schema.
     */
    const shouldUpdateSchema = (shouldUpdate: boolean) => {
        expect(mocks.requirePluginModuleCallback).toHaveBeenCalledTimes(1);
        expect(mocks.loadConfiguration).toHaveBeenCalledTimes(1);

        if (shouldUpdate) {
            expect(mocks.addProfiles).toHaveBeenCalledTimes(1);
            expect(mocks.ConfigSchema.updateSchema).toHaveBeenCalledTimes(1);
            expect(mocks.ConfigSchema.updateSchema).toHaveBeenCalledWith(expect.objectContaining({ layer: "global" }));
        } else {
            expect(mocks.addProfiles).not.toHaveBeenCalled();
            expect(mocks.ConfigSchema.updateSchema).not.toHaveBeenCalled();
        }
    };

    /**
     * Validates that the writeFileSync was called with the proper JSON object. This object is created
     * by merging the object returned by readFileSync (should be mocked) and an object that represents
     * the new plugin added according to the plugins.json file syntax.
     *
     * @param {IPluginJson} originalJson The JSON object that was returned by readFileSync
     * @param {string} expectedName The name of the plugin that was installed
     * @param {IPluginJsonObject} expectedNewPlugin The expected object for the new plugin
     */
    const wasWriteFileSyncCallValid = (originalJson: IPluginJson, expectedName: string, expectedNewPlugin: IPluginJsonObject) => {
        // Create the object that should be sent to the command.
        const expectedObject = {
            ...originalJson
        };
        expectedObject[expectedName] = expectedNewPlugin;

        expect(mocks.writeFileSync).toHaveBeenCalledWith(
            PMFConstants.instance.PLUGIN_JSON,
            expectedObject,
            {
                spaces: 2
            }
        );
    };

    describe("Basic install", () => {
        beforeEach(() => {
            mocks.getPackageInfo.mockResolvedValue({ name: packageName, version: packageVersion });
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            jest.spyOn(fs, "lstatSync").mockReturnValue({
                isSymbolicLink: jest.fn().mockReturnValue(true)
            } as any);
        });

        it("should install from the npm registry", async () => {
            setResolve(packageName);
            await install(packageName, registryInfo);

            // Validate the install
            wasNpmInstallCallValid(packageName, packageRegistry);
            wasWriteFileSyncCallValid({}, packageName, {
                package: packageName,
                location: packageRegistry,
                version: packageVersion
            });
        });

        it("should install an absolute file path", async () => {
            const rootFile = "/root/a";

            jest.spyOn(path, "isAbsolute").mockReturnValueOnce(true);
            setResolve(rootFile);
            await install(rootFile, registryInfo);

            // Validate the install
            wasNpmInstallCallValid(rootFile, packageRegistry);
            wasWriteFileSyncCallValid({}, packageName, {
                package: rootFile,
                location: packageRegistry,
                version: packageVersion
            });
        });

        it("should install an absolute file path with spaces", async () => {
            const rootFile = "/root/a dir/another dir/a";

            jest.spyOn(path, "isAbsolute").mockReturnValueOnce(true);
            setResolve(rootFile);
            await install(rootFile, registryInfo);

            // Validate the install
            wasNpmInstallCallValid(rootFile, packageRegistry);
            wasWriteFileSyncCallValid({}, packageName, {
                package: rootFile,
                location: packageRegistry,
                version: packageVersion
            });
        });

        describe("relative file path", () => {
            const relativePath = "../../install/a";
            const absolutePath = "/root/node/cli/install/a";

            // Mock these before each test here since they are common
            beforeEach(() => {
                jest.spyOn(path, "isAbsolute").mockReturnValueOnce(false);
                jest.spyOn(path, "resolve").mockReturnValueOnce(absolutePath);
            });

            it("should install a relative file path", async () => {
                // Setup mocks for install function
                jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);

                // Call the install function
                setResolve(relativePath, absolutePath);
                await install(relativePath, registryInfo);

                // Validate results
                wasNpmInstallCallValid(absolutePath, packageRegistry);
                wasWriteFileSyncCallValid({}, packageName, {
                    package: absolutePath,
                    location: packageRegistry,
                    version: packageVersion
                });
            });
        });

        it("should install from a url", async () => {
            const installUrl = "http://www.example.com";
            setResolve(installUrl);

            // mocks.isUrl.mockReturnValue(true);

            await install(installUrl, registryInfo);

            wasNpmInstallCallValid(installUrl, packageRegistry);
            wasWriteFileSyncCallValid({}, packageName, {
                package: installUrl,
                location: packageRegistry,
                version: packageVersion
            });
        });

        it("should install plugin that does not define profiles", async () => {
            mocks.loadConfiguration.mockReturnValueOnce({});
            setResolve(packageName);
            await install(packageName, registryInfo);

            // Validate the install
            wasNpmInstallCallValid(packageName, packageRegistry, false);
            wasWriteFileSyncCallValid({}, packageName, {
                package: packageName,
                location: packageRegistry,
                version: packageVersion
            });
        });
    }); // end Basic install

    describe("Advanced install", () => {
        it("should write even when install from file is true", async () => {
            // This test is constructed in such a way that all if conditions with installFromFile
            // are validated to have been called or not.
            const location = "/this/should/not/change";

            jest.spyOn(path, "isAbsolute").mockReturnValueOnce(false);
            jest.spyOn(fs, "existsSync").mockReturnValue(true);
            mocks.getPackageInfo.mockResolvedValue({ name: packageName, version: packageVersion });
            jest.spyOn(fs, "lstatSync").mockReturnValue({
                isSymbolicLink: jest.fn().mockReturnValue(true)
            } as any);

            await install(location, registryInfo, true);

            wasNpmInstallCallValid(location, packageRegistry);
            expect(mocks.writeFileSync).toHaveBeenCalled();
        });

        it("should accept semver properly", async () => {
            const semverVersion = "^1.5.2";
            const semverPackage = `${packageName}@${semverVersion}`;

            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "lstatSync").mockReturnValue({
                isSymbolicLink: jest.fn().mockReturnValue(true)
            } as any);

            // While this doesn't replicate the function, we are installing an npm package
            // so it is shorter to just skip the if condition in install.
            jest.spyOn(path, "isAbsolute").mockReturnValueOnce(true);

            // This is valid under semver ^1.5.2
            mocks.getPackageInfo.mockResolvedValue({ name: packageName, version: "1.5.16" });

            // Call the install
            setResolve(semverPackage);
            await install(semverPackage, registryInfo);

            // Test that shit happened
            wasNpmInstallCallValid(semverPackage, packageRegistry);
            wasWriteFileSyncCallValid({}, packageName, {
                package: packageName,
                location: packageRegistry,
                version: semverVersion
            });
        });

        it("should merge contents of previous plugins.json file", async () => {
            // value for our previous plugins.json
            const oneOldPlugin: IPluginJson = {
                plugin1: {
                    package: "plugin1",
                    location: packageRegistry,
                    version: "1.2.3"
                }
            };

            mocks.getPackageInfo.mockResolvedValue({ name: packageName, version: packageVersion });
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "lstatSync").mockReturnValue({
                isSymbolicLink: jest.fn().mockReturnValue(true)
            } as any);
            mocks.readFileSync.mockReturnValue(oneOldPlugin);

            setResolve(packageName);
            await install(packageName, registryInfo);

            wasNpmInstallCallValid(packageName, packageRegistry);
            wasWriteFileSyncCallValid(oneOldPlugin, packageName, {
                package: packageName,
                location: packageRegistry,
                version: packageVersion
            });
        });

        describe("Updating the global schema", () => {
            const expectTestSchemaMgmt = async (opts: {
                schemaExists: boolean;
                newProfileType: boolean;
                version?: string;
                lastVersion?: string;
            }) => {
                const oneOldPlugin: IPluginJson = {
                    plugin1: {
                        package: "plugin1",
                        location: packageRegistry,
                        version: "1.2.3"
                    }
                };
                if (opts.newProfileType) {
                    const schema = { ...mockTypeConfig, schema: { ...mockTypeConfig.schema, version: opts.version } };
                    mocks.loadConfiguration.mockReturnValue({
                        profiles: [
                            schema
                        ]
                    });
                }

                mocks.getPackageInfo.mockResolvedValue({ name: packageName, version: packageVersion });
                jest.spyOn(fs, "existsSync").mockReturnValueOnce(true).mockReturnValueOnce(opts.schemaExists);
                jest.spyOn(fs, "lstatSync").mockReturnValue({
                    isSymbolicLink: jest.fn().mockReturnValue(true)
                } as any);
                mocks.readFileSync.mockReturnValue(oneOldPlugin);

                if (opts.lastVersion) {
                    mocks.ConfigUtils.readExtendersJson.mockReturnValueOnce({
                        profileTypes: {
                            "test-type": {
                                from: [oneOldPlugin.plugin1.package],
                                version: opts.lastVersion,
                                latestFrom: oneOldPlugin.plugin1.package
                            }
                        }
                    });
                }

                setResolve(packageName);
                await install(packageName, registryInfo);
                if (opts.schemaExists) {
                    expect(mocks.ConfigSchema.updateSchema).toHaveBeenCalled();
                } else {
                    expect(mocks.ConfigSchema.updateSchema).not.toHaveBeenCalled();
                }

                if (opts.version && opts.lastVersion) {
                    if (versionGreaterThan(opts.version, opts.lastVersion)) {
                        expect(mocks.ConfigUtils.writeExtendersJson).toHaveBeenCalled();
                    } else {
                        expect(mocks.ConfigUtils.writeExtendersJson).not.toHaveBeenCalled();
                    }
                }
            };
            it("should update the schema to contain the new profile type", async () => {
                expectTestSchemaMgmt({
                    schemaExists: true,
                    newProfileType: true
                });
            });

            it("should not update the schema if it doesn't exist", async () => {
                expectTestSchemaMgmt({
                    schemaExists: false,
                    newProfileType: true
                });
            });

            it("updates the schema with a newer schema version than the one present", () => {
                expectTestSchemaMgmt({
                    schemaExists: true,
                    newProfileType: true,
                    version: "2.0.0",
                    lastVersion: "1.0.0"
                });
            });

            it("doesn't update the schema with an older schema version than the one present", () => {
                expectTestSchemaMgmt({
                    schemaExists: true,
                    newProfileType: true,
                    version: "1.0.0",
                    lastVersion: "2.0.0"
                });
            });
        });

        describe("updating extenders.json", () => {
            it("adds a new profile type if it doesn't exist", () => {
                const extendersJson = { profileTypes: {} } as IExtendersJsonOpts;
                updateExtendersJson(extendersJson, { name: "aPkg", version: "1.0.0" }, mockTypeConfig);
                expect(extendersJson.profileTypes["test-type"]).not.toBeUndefined();
            });

            it("replaces a profile type with a newer schema version", () => {
                const extendersJson = { profileTypes: { "test-type": { from: ["Zowe Client App"], version: "0.9.0" } } };
                updateExtendersJson(extendersJson, { name: "aPkg", version: "1.0.0" },
                    { ...mockTypeConfig, schema: { ...mockTypeConfig.schema, version: "1.0.0" } });
                expect(extendersJson.profileTypes["test-type"]).not.toBeUndefined();
                expect(extendersJson.profileTypes["test-type"].version).toBe("1.0.0");
            });

            it("does not change the schema version if older", () => {
                const extendersJson = { profileTypes: { "test-type": { from: ["Zowe Client App"], version: "1.2.0" } } };
                updateExtendersJson(extendersJson, { name: "aPkg", version: "1.0.0" },
                    { ...mockTypeConfig, schema: { ...mockTypeConfig.schema, version: "1.0.0" } });
                expect(extendersJson.profileTypes["test-type"]).not.toBeUndefined();
                expect(extendersJson.profileTypes["test-type"].version).toBe("1.2.0");
            });
        });

        it("should throw errors", async () => {
            // Create a placeholder error object that should be set after the call to install
            let expectedError: ImperativeError = new ImperativeError({
                msg: "fake error"
            });
            const error = new Error("This should be caught");

            mocks.installPackages.mockImplementation(() => {
                throw error;
            });

            try {
                await install("test", registryInfo);
            } catch (e) {
                expectedError = e;
            }

            // Check that the expected ImperativeError was thrown
            expect(expectedError).toEqual(new ImperativeError({
                msg: error.message,
                causeErrors: error
            }));
        });
    }); // end Advanced install

    describe("callPluginPostInstall", () => {
        const knownCredMgr = "@zowe/secrets-for-kubernetes-for-zowe-cli";
        const postInstallErrText = "Pretend that the plugin's postInstall function threw an error";
        let callPluginPostInstall : any;
        let fakePluginConfig: IImperativeConfig;
        let installModule;
        let LifeCycleClass: any;
        let postInstallWorked = false;
        let requirePluginModuleCallbackSpy: any;

        /**
         *  Set config to reflect if a plugin has a lifecycle class.
         */
        const pluginShouldHaveLifeCycle = (shouldHaveIt: boolean): void => {
            if (shouldHaveIt) {
                fakePluginConfig = {
                    pluginLifeCycle: "fake/path/to/file/with/LC/class"
                };
            } else {
                fakePluginConfig = {
                    // no LifeCycle
                };
            }
        };

        /**
         *  Create a lifecycle class to reflect if postInstall should work or not
         */
        const postInstallShouldWork = (shouldWork: boolean): void => {
            if (shouldWork) {
                LifeCycleClass = class extends AbstractPluginLifeCycle {
                    postInstall() {
                        postInstallWorked = true;
                    }
                    preUninstall() {
                        return;
                    }
                };
            } else {
                LifeCycleClass = class extends AbstractPluginLifeCycle {
                    postInstall() {
                        throw new ImperativeError({
                            msg: postInstallErrText
                        });
                    }
                    preUninstall() {
                        return;
                    }
                };
            }
        };

        beforeAll(() => {
            // make requirePluginModuleCallback return our fake LifeCycleClass
            requirePluginModuleCallbackSpy = jest.spyOn(
                PluginManagementFacility.instance, "requirePluginModuleCallback").
                mockImplementation((_pluginName: string) => {
                    return () => {
                        return LifeCycleClass as any;
                    };
                });

            // gain access to the non-exported callPluginPostInstall function
            installModule = require("../../../../src/plugins/utilities/npm-interface/install");
            callPluginPostInstall = installModule.onlyForTesting.callPluginPostInstall;
        });

        beforeEach(() => {
            postInstallWorked = false;
        });

        it("should throw an error if a known credMgr does not implement postInstall", async () => {
            // force our plugin to have NO LifeCycle class
            pluginShouldHaveLifeCycle(false);

            let thrownErr: any;
            try {
                await callPluginPostInstall(knownCredMgr, {});
            } catch (err) {
                thrownErr = err;
            }
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain("The plugin");
            expect(thrownErr.message).toContain(
                "attempted to override the CLI Credential Manager without providing a 'pluginLifeCycle' class"
            );
            expect(thrownErr.message).toContain("The previous Credential Manager remains in place.");
        });

        it("should do nothing if a non-credMgr does not implement postInstall", async () => {
            // force our plugin to have NO LifeCycle class
            pluginShouldHaveLifeCycle(false);

            let thrownErr: any;
            try {
                await callPluginPostInstall("plugin_does_not_override_cred_mgr", {});
            } catch (err) {
                thrownErr = err;
            }
            expect(thrownErr).not.toBeDefined();
        });

        it("should call the postInstall function of a plugin", async () => {
            // force our plugin to have a LifeCycle class
            pluginShouldHaveLifeCycle(true);

            // force our plugin's postInstall function to succeed
            postInstallShouldWork(true);

            let thrownErr: any;
            try {
                await callPluginPostInstall("FakePluginPackageName", fakePluginConfig);
            } catch (err) {
                thrownErr = err;
            }
            expect(requirePluginModuleCallbackSpy).toHaveBeenCalledTimes(1);
            expect(thrownErr).not.toBeDefined();
            expect(postInstallWorked).toBe(true);
        });

        it("should catch an error from a plugin's postInstall function", async () => {
            // force our plugin to have a LifeCycle class
            pluginShouldHaveLifeCycle(true);

            // force our plugin's postInstall function to fail
            postInstallShouldWork(false);

            let thrownErr: any;
            try {
                await callPluginPostInstall("FakePluginPackageName", fakePluginConfig);
            } catch (err) {
                thrownErr = err;
            }
            expect(requirePluginModuleCallbackSpy).toHaveBeenCalledTimes(1);
            expect(postInstallWorked).toBe(false);
            expect(thrownErr).toBeDefined();
            expect(thrownErr.message).toContain(
                "Unable to perform the post-install action for plugin 'FakePluginPackageName'."
            );
            expect(thrownErr.message).toContain(postInstallErrText);
        });
    }); // end callPluginPostInstall
}); // PMF: Install Interface
