/*
* This program and the accompanying materials are made available under the terms of the *
* Eclipse Public License v2.0 which accompanies this distribution, and is available at *
* https://www.eclipse.org/legal/epl-v20.html                                      *
*                                                                                 *
* SPDX-License-Identifier: EPL-2.0                                                *
*                                                                                 *
* Copyright Contributors to the Zowe Project.                                     *
*                                                                                 *
*/

import { ITestEnvironment } from "../../../../../../__tests__/__src__/environment/doc/response/ITestEnvironment";
import { runCliScript } from "../../../../../../__tests__/__src__/TestUtils";
import * as fs from "fs";
import { ITestSystemSchema } from "../../../../../../__tests__/__src__/properties/ITestSystemSchema";
import { Session } from "@brightside/imperative";
import { TestProperties } from "../../../../../../__tests__/__src__/properties/TestProperties";
import { TestEnvironment } from "../../../../../../__tests__/__src__/environment/TestEnvironment";

// Test Environment populated in the beforeAll();
let TEST_ENVIRONMENT: ITestEnvironment;
let systemProps: TestProperties;
let defaultSystem: ITestSystemSchema;
let REAL_SESSION: Session;
let acc: string;

describe("zos-tso issue command", () => {

    // Create the unique test environment
    beforeAll(async () => {
        TEST_ENVIRONMENT = await TestEnvironment.setUp({
            testName: "zos_tso_start_as",
            tempProfileTypes: ["zosmf", "tso"]
        });

        systemProps = new TestProperties(TEST_ENVIRONMENT.systemTestProperties);
        defaultSystem = systemProps.getDefaultSystem();

        REAL_SESSION = new Session({
            user: defaultSystem.zosmf.user,
            password: defaultSystem.zosmf.pass,
            hostname: defaultSystem.zosmf.host,
            port: defaultSystem.zosmf.port,
            type: "basic",
            rejectUnauthorized: defaultSystem.zosmf.rejectUnauthorized
        });
        acc = defaultSystem.tso.account;
    });

    afterAll(async () => {
        await TestEnvironment.cleanUp(TEST_ENVIRONMENT);
    });

    it("should display the help", async () => {
        const response = runCliScript(__dirname + "/__scripts__/as/as_help.sh", TEST_ENVIRONMENT);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).toMatchSnapshot();
    });

    it("should successfully issue command = \"time\"", async () => {
        const regex = fs.readFileSync(__dirname + "/__regex__/address_space_response.regex").toString();
        const response = runCliScript(__dirname + "/__scripts__/as/address_space_success.sh", TEST_ENVIRONMENT);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(new RegExp(regex, "g").test(response.stdout.toString())).toBe(true);
    });

    it("should honor the logon proc specified in the profile", async () => {
        systemProps = new TestProperties(TEST_ENVIRONMENT.systemTestProperties);
        defaultSystem = systemProps.getDefaultSystem();
        const fakeProc = "F4K3PR0C";
        const response = runCliScript(__dirname + "/__scripts__/as/change_proc.sh", TEST_ENVIRONMENT, [
            defaultSystem.tso.account,
            fakeProc
        ]);
        expect(response.stderr.toString()).toBe("");
        expect(response.status).toBe(0);
        expect(response.stdout.toString()).toContain(fakeProc);
    });

    describe("without profiles", () => {

        // Create a seperate test environment for no profiles
        let TEST_ENVIONMENT_NO_PROF;
        beforeAll(async () => {
            TEST_ENVIONMENT_NO_PROF = await TestEnvironment.setUp({
                testName: "zos_tso_start_as_without_profiles"
            });

            systemProps = new TestProperties(TEST_ENVIONMENT_NO_PROF.systemTestProperties);
            defaultSystem = systemProps.getDefaultSystem();
            acc = defaultSystem.tso.account;
        });

        afterAll(async () => {
            await TestEnvironment.cleanUp(TEST_ENVIONMENT_NO_PROF);
        });

        it("should successfully issue command = \"time\" without a profile", async () => {
            const regex = fs.readFileSync(__dirname + "/__regex__/address_space_response.regex").toString();
            const response = runCliScript(__dirname + "/__scripts__/as/address_space_fully_qualified.sh",
            TEST_ENVIRONMENT,
            [
                defaultSystem.zosmf.host,
                defaultSystem.zosmf.port,
                defaultSystem.zosmf.user,
                defaultSystem.zosmf.pass,
                defaultSystem.tso.account
            ]
            );
            expect(response.stderr.toString()).toBe("");
            expect(response.status).toBe(0);
            expect(new RegExp(regex, "g").test(response.stdout.toString())).toBe(true);
        });
    });
});
