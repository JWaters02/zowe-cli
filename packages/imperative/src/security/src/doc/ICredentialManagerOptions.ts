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

/**
 * Defines the persistence level for credentials stored in the credential vault.
 * These levels map to the Windows Credential Manager persistence levels.
 * 
 * On non-Windows platforms, all levels behave the same as Enterprise.
 */
export enum CredentialPersistence {
    /**
     * The credential persists for the life of the logon session.
     * It will not be visible to other logon sessions of this same user.
     * It will not exist after this user logs off and back on.
     */
    Session = "session",

    /**
     * The credential persists for all subsequent logon sessions on this same computer.
     * It is visible to other logon sessions of this same user on this same computer 
     * and not visible to logon sessions for this user on other computers.
     */
    LocalMachine = "localMachine",

    /**
     * The credential persists for all subsequent logon sessions on this same computer.
     * It is visible to other logon sessions of this same user on this same computer 
     * and to logon sessions for this user on other computers.
     * 
     * This is the default persistence level.
     */
    Enterprise = "enterprise"
}

/**
 * Options for saving credentials with specific persistence behavior.
 */
export interface ICredentialSaveOptions {
    /**
     * The persistence level for the credential.
     * Defaults to Enterprise if not specified.
     */
    persistence?: CredentialPersistence;
}
