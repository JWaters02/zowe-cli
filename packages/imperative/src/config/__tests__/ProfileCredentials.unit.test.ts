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

import * as fs from "fs";
import { CredentialManagerFactory, DefaultCredentialManager, ICredentialManagerInit } from "../../security";
import { ConfigSecure } from "../src/api/ConfigSecure";
import { ProfileCredentials } from "../src/ProfileCredentials";

jest.mock("../../security/src/CredentialManagerFactory");
jest.mock("../../security/src/DefaultCredentialManager");
jest.mock("../../utilities/src/ImperativeConfig");

function mockConfigApi(secureApi: Partial<ConfigSecure>, opts?: any): any {
    return {
        api: { secure: secureApi },
        layerActive: opts?.layerActive,
    };
}

describe("ProfileCredentials tests", () => {
    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe("isSecured", () => {
        it("should be true if team config is not secure but CredentialManager is set", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({ secureFields: () => [] })
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(true);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be true if team config is secure but CredentialManager is not set", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({ secureFields: () => ["myAwesomeProperty"] })
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be true when overriding the credential manager if team config is secure but CredentialManager is not set", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({ secureFields: () => ["myAwesomeProperty"] })
            } as any, jest.fn());
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be true when checkLevelLayers is true if non-user config is secure and user config is not secure", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({
                    secureFields: (opts) => opts?.user ? [] : ["myAwesomeProperty"],
                }, {
                    layerActive: () => ({ user: true, global: false })
                })
            } as any, {
                checkLevelLayers: true
            });
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(true);
        });

        it("should be false when checkLevelLayers is true if non-user and user config are not secure", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({
                    secureFields: () => [],
                }, {
                    layerActive: () => ({ user: true, global: false })
                })
            } as any, {
                checkLevelLayers: true
            });
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(false);
        });

        it("should be false if team config is not secure and CredentialManager is not set", () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({ secureFields: () => [] })
            } as any);
            jest.spyOn(profCreds as any, "isCredentialManagerInAppSettings").mockReturnValueOnce(false);
            expect(profCreds.isSecured).toBe(false);
        });

        it("should not be cached for subsequent calls", () => {
            const profCreds = new ProfileCredentials({} as any);
            jest.spyOn(profCreds as any, "isTeamConfigSecure").mockReturnValueOnce(false).mockReturnValueOnce(true);
            expect(profCreds.isSecured).toBe(false);
            // expect a 2nd time to ensure value has changed
            expect(profCreds.isSecured).toBe(true);
        });
    });

    describe("loadManager", () => {
        afterEach(() => {
            jest.clearAllMocks();
        });

        it("should fail if secure credential storage is disabled", async () => {
            const profCreds = new ProfileCredentials(null);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(false);
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Secure credential storage is not enabled");
        });

        it("should initialize CredentialManagerFactory once with good credential manager", async () => {
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({
                    secureFields: () => [],
                    load: jest.fn()
                })
            } as any);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation(async () => {
                Object.defineProperty(CredentialManagerFactory, "initialized", {
                    get: jest.fn().mockReturnValueOnce(true)
                });
            });
            let caughtError;

            try {
                await profCreds.loadManager();
                // load a 2nd time to ensure nothing happens
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        });

        it("should fail to initialize CredentialManagerFactory with bad credential manager", async () => {
            const profCreds = new ProfileCredentials({} as any);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation(async () => {
                throw new Error("bad credential manager");
            });
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toMatch(/^Failed to load CredentialManager class:/);
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
        });

        it("should load custom credential manager if override is specified", async () => {
            const mockCredMgrInitialize = jest.fn();
            const credMgrOverride: ICredentialManagerInit = {
                service: "@zowe/cli",
                displayName: "Zowe CLI",
                Manager: class extends DefaultCredentialManager {
                    constructor(service: string, displayName?: string) {
                        super(service, displayName);
                        expect(service).toBe(credMgrOverride.service);
                        expect(displayName).toBe(credMgrOverride.displayName);
                    }
                    public initialize = mockCredMgrInitialize;
                }
            };
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({
                    secureFields: () => ["myAwesomeProperty"],
                    load: jest.fn()
                }),
            } as any, { credMgrOverride });
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation(async (params: ICredentialManagerInit) => {
                await new (params.Manager as typeof DefaultCredentialManager)(params.service, params.displayName).initialize();
            });
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
            expect(mockCredMgrInitialize).toHaveBeenCalledTimes(1);
        });

        it("should call Config secure load API when team config enabled", async () => {
            const mockSecureLoad = jest.fn();
            const profCreds = new ProfileCredentials({
                getTeamConfig: () => mockConfigApi({ load: mockSecureLoad })
            } as any);
            jest.spyOn(profCreds, "isSecured", "get").mockReturnValue(true);
            jest.spyOn(CredentialManagerFactory, "initialize").mockImplementation();
            let caughtError;

            try {
                await profCreds.loadManager();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeUndefined();
            expect(CredentialManagerFactory.initialize).toHaveBeenCalledTimes(1);
            expect(mockSecureLoad).toHaveBeenCalledTimes(1);
            expect(mockSecureLoad.mock.calls[0][0].load).toBeDefined();
            expect(mockSecureLoad.mock.calls[0][0].save).toBeDefined();
        });
    });

    describe("isCredentialManagerInAppSettings", () => {
        const isCredMgrInAppSettings = (ProfileCredentials.prototype as any).isCredentialManagerInAppSettings;

        it("should return true if CredentialManager found in app settings", () => {
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
                overrides: {
                    CredentialManager: "vault"
                }
            }));
            expect(isCredMgrInAppSettings()).toBe(true);
        });

        it("should return true if credential-manager found in app settings", () => {
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
                overrides: {
                    "credential-manager": "vault"
                }
            }));
            expect(isCredMgrInAppSettings()).toBe(true);
        });

        it("should return false if CredentialManager not found in app settings", () => {
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "readFileSync").mockReturnValueOnce(null);
            expect(isCredMgrInAppSettings()).toBe(false);
        });

        it("should return false if app settings file not found", () => {
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(false);
            expect(isCredMgrInAppSettings()).toBe(false);
        });

        it("should fail when unexpected error encountered", () => {
            jest.spyOn(fs, "existsSync").mockReturnValueOnce(true);
            jest.spyOn(fs, "readFileSync").mockImplementationOnce(() => {
                throw new Error("unexpected EOF");
            });
            let caughtError;

            try {
                isCredMgrInAppSettings();
            } catch (error) {
                caughtError = error;
            }

            expect(caughtError).toBeDefined();
            expect(caughtError.message).toBe("Unable to read Imperative settings file");
        });
    });
});
