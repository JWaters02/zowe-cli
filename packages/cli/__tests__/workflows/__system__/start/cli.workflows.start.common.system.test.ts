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

import { Session, Imperative } from "@zowe/imperative";
import { runCliScript } from "@zowe/cli-test-utils";
import { TestEnvironment } from "../../../../../../__tests__/__src__/environment/TestEnvironment";
import { ITestPropertiesSchema } from "../../../../../../__tests__/__src__/properties/ITestPropertiesSchema";
import { getUniqueDatasetName } from "../../../../../../__tests__/__src__/TestUtils";
import { Upload } from "@zowe/zos-files-for-zowe-sdk";
import { join } from "path";
import { CreateWorkflow, PropertiesWorkflow, DeleteWorkflow, startT, IWorkflowInfo, WorkflowConstants,
    IStepInfo } from "@zowe/zos-workflows-for-zowe-sdk";
import { ITestEnvironment } from "../../../../../../__tests__/__src__/environment/ITestEnvironment";

const resolveConflict: startT = "outputFileValue";
const stepName = "echo";

let REAL_SESSION: Session;
let testEnvironment: ITestEnvironment<ITestPropertiesSchema>;
let defaultSystem: ITestPropertiesSchema;
let definitionFile: string;
let wfKey: string;
let system: string;
let owner: string;
let wfName: string;
const workflow = join(__dirname, "../../../../../workflows/__tests__/__system__/testfiles/demo.xml");

describe("Start workflow cli system tests", () => {
    beforeAll(async () => {
        testEnvironment = await TestEnvironment.setUp({
            tempProfileTypes: ["zosmf"],
            testName: "create_workflow_cli"
        });
        defaultSystem = testEnvironment.systemTestProperties;
        system = testEnvironment.systemTestProperties.workflows.system;
        owner = defaultSystem.zosmf.user;
        wfName = `${getUniqueDatasetName(owner)}`;
        definitionFile = `${defaultSystem.unix.testdir}/${getUniqueDatasetName(owner)}.xml`;

        REAL_SESSION = TestEnvironment.createZosmfSession(testEnvironment);
    });

    afterAll(async () => {
        await TestEnvironment.cleanUp(testEnvironment);
    });
    describe("Start workflow", () => {
        beforeAll(async () => {
            // Upload files only for successful scenarios
            await Upload.fileToUssFile(REAL_SESSION, workflow, definitionFile, { binary: true });
            testEnvironment.resources.files.push(definitionFile);
        });
        describe("Success Scenarios", () => {
            afterEach(async () => {
                let response: IWorkflowInfo;
                let flag = false;
                while (!flag) {
                    response = await PropertiesWorkflow.getWorkflowProperties(REAL_SESSION, wfKey, WorkflowConstants.ZOSMF_VERSION, true);
                    response.steps.forEach((step: IStepInfo) => {
                        if (step.state === "Complete" && response.statusName !== "automation-in-progress") {
                            flag = true;
                        }
                    });
                    if (response.automationStatus && response.statusName !== "automation-in-progress") {
                        flag = true;
                    }
                }
            });
            beforeAll(async () => {
                const response = await CreateWorkflow.createWorkflow(REAL_SESSION, wfName, definitionFile, system, owner);
                wfKey = response.workflowKey;
            });
            afterAll(async () => {
                try {
                    await DeleteWorkflow.deleteWorkflow(REAL_SESSION, wfKey);
                } catch (err) {
                    Imperative.console.info(err);
                }
            });
            it("Should start full workflow using wf key in zOSMF.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_key_full.sh",
                    testEnvironment, [wfKey, resolveConflict]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow");
            });
            it("Should start full workflow using wf Name in zOSMF.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_name_full.sh",
                    testEnvironment, [wfName, resolveConflict]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow");
            });
            it("Should start one workflow using wf Key and step.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_key_step.sh",
                    testEnvironment, [stepName, wfKey, resolveConflict]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow step started.");
            });
            it("Should start one workflow using wf Name and step.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_name_step.sh",
                    testEnvironment, [stepName, wfName, resolveConflict]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow step started.");
            });
            it("Should start one workflow step using wf Key.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_key_step_plus_following.sh",
                    testEnvironment, [stepName, wfKey, resolveConflict, "--perform-following-steps"]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow step started.");
            });
            it("Should start one workflow step using wf Name.", () => {
                const response = runCliScript(__dirname + "/__scripts__/command/command_start_workflow_name_step_plus_following.sh",
                    testEnvironment, [stepName, wfName, resolveConflict, "--perform-following-steps"]);
                expect(response.stderr.toString()).toBe("");
                expect(response.status).toBe(0);
                expect(response.stdout.toString()).toContain("Workflow step started.");
            });
        });
    });
});
