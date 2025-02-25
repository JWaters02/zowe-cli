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

import { INpmInstallArgs } from "./INpmInstallArgs";

/**
 * Location info for an npm package.
 */
export interface INpmRegistryInfo {
    /**
     * The origin of npm package (registry URL or absolute path)
     */
    location: string;

    /**
     * Defines npm config values to pass to `npm install` command
     */
    npmArgs: Partial<INpmInstallArgs>;
}
