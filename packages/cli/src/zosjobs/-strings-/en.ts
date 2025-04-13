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

// Todo: migrate strings into here for other JOBS commands

export default {
    CANCEL: {
        SUMMARY: "Cancel a z/OS job",
        DESCRIPTION: "Cancel a single job by job ID. This cancels the job if it is running or on input.",
        ACTIONS: {
            JOB: {
                SUMMARY: "Cancel a single job by job ID",
                DESCRIPTION: "Cancel a single job by job ID.",
                POSITIONALS: {
                    JOB_ID: "The job ID (e.g. JOB00123) of the job. Job ID is a unique identifier for z/OS batch jobs " +
                        "-- no two jobs on one system can have the same ID. Note: z/OS allows you to abbreviate " +
                        "the job ID if desired. You can use, for example \"J123\"."
                },
                OPTIONS: {},
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Cancel job with job ID JOB03456",
                        OPTIONS: "JOB03456"
                    },
                    EX2: {
                        DESCRIPTION: "Cancel job with job ID JOB03456 synchronously",
                        OPTIONS: "JOB03456 --modify-version \"2.0\""
                    }
                }
            }
        }
    },
    MODIFY: {
        SUMMARY: "Modify a z/OS job",
        DESCRIPTION: "Modify the job class or the hold status of a job.",
        ACTIONS: {
            JOB: {
                SUMMARY: "Modify the job class or the hold status of a job",
                DESCRIPTION: "Modify the job class or the hold status of a job.",
                POSITIONALS: {
                    JOB_ID: "The job ID (e.g. JOB00123) of the job. Job ID is a unique identifier for z/OS batch jobs " +
                        "-- no two jobs on one system can have the same ID. Note: z/OS allows you to abbreviate " +
                        "the job ID if desired. You can use, for example \"J123\".",
                },
                OPTIONS: {
                    JOB_CLASS: "The job class (e.g. 'A', 'B', ...) assigned to the job.",
                    HOLD: "Setting this flag will prevent a job from executing until " +
                        "entering a second command with the '--release' flag",
                    RELEASE: "Flag that releases a held a job for execution",
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Modify class of job with job ID JOB0000",
                        OPTIONS: "JOB0000 --jobclass A",
                    },
                    EX2: {
                        DESCRIPTION: "Hold job with job ID JOB0000",
                        OPTIONS: "JOB0000 --hold",
                    },
                    EX3: {
                        DESCRIPTION: "Release job with job ID JOB0000",
                        OPTIONS: "JOB0000 --release",
                    },
                }
            }
        }
    },
    SEARCH: {
        SUMMARY: "Search the spool output of a z/OS job",
        DESCRIPTION: "Search the spool output of a job.",
        ACTIONS: {
            JOB: {
                SUMMARY: "Search the spool output of a job.",
                DESCRIPTION: "Search the spool output of a job.",
                POSITIONALS: {
                    JOBNAME: "The job name to search. Wildcards are accepted for the job name." +
                        " You can use, for example \"USERJOB*\" to search all jobs that start" +
                        " with USERJOB."
                },
                OPTIONS: {
                    SEARCHSTRING: "The string to search for in the spool output.",
                    SEARCHREGEX: "The regular expression to search for in the spool output.",
                    CASEINSENSITIVE: "The search is case insensitive or not.",
                    SEARCHLIMIT: "The maximum number of matching lines to return for an individual spool file.",
                    FILELIMIT: "The maximum number of spool files to search."
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Search all jobs named USERJOB for the string \"RC=0000\"",
                        OPTIONS: "\"USERJOB\" --search-string \"RC=0000\"",
                    },
                    EX2: {
                        DESCRIPTION: "Search all jobs that start with USER for the string \"ENDED\"",
                        OPTIONS: "\"USER*\" --search-string \"ENDED\"",
                    },
                    EX3: {
                        DESCRIPTION: "Search all jobs named USERJOB for the string \"COND CODE\", with the options" +
                        " case sensitive and a search limit of 5",
                        OPTIONS: "\"USERJOB\" --search-string \"COND CODE\" --case-insensitive false --search-limit 5"
                    },
                }
            }
        }
    },
    DELETE: {
        SUMMARY: "Delete a z/OS job or jobs",
        DESCRIPTION: "Delete a single job by job ID or delete multiple jobs in OUTPUT status.",
        ACTIONS: {
            JOB: {
                SUMMARY: "Delete a single job by job ID",
                DESCRIPTION: "Delete a single job by job ID.",
                POSITIONALS: {
                    JOB_ID: "The job ID (e.g. JOB00123) of the job. Job ID is a unique identifier for z/OS batch jobs " +
                        "-- no two jobs on one system can have the same ID. Note: z/OS allows you to abbreviate " +
                        "the job ID if desired. You can use, for example \"J123\"."
                },
                OPTIONS: {},
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Delete job with job ID JOB03456",
                        OPTIONS: "JOB03456"
                    },
                    EX2: {
                        DESCRIPTION: "Delete job with job ID JOB03456 synchronously",
                        OPTIONS: "JOB03456 --modify-version \"2.0\""
                    }
                }
            },
            OLD_JOBS: {
                SUMMARY: "Delete multiple jobs in OUTPUT status",
                DESCRIPTION: "Delete (purge) jobs in OUTPUT status. Defaults to deleting all jobs owned by your user ID that are in output status.",
                OPTIONS: {
                    PREFIX: "Only delete jobs with job names that match this prefix. " +
                        "Defaults to deleting all jobs owned by your user ID that are in output status.",
                    MAX_CONCURRENT_REQUESTS: "Specifies the maximum number of concurrent z/OSMF REST API requests to delete jobs. " +
                        "Increasing the value makes the command run faster. " +
                        "However, increasing the value increases resource consumption on z/OS and can be prone to errors caused by making too " +
                        "many concurrent requests. " +
                        "When you specify 0, Zowe CLI attempts to delete all jobs at once without a maximum number of concurrent requests."
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Delete all of your jobs in output status with a job name starting with \"ibmuser\"",
                        OPTIONS: "--prefix \"ibmuser*\""
                    }
                }
            }
        }
    },
    DOWNLOAD: {
    },
    LIST: {
    },
    OPTIONS: {
        MODIFY_VERSION: "Using this option to set X-IBM-Job-Modify-Version to \"1.0\" will make the delete job API asynchronous. " +
            "Otherwise, it will be synchronous by default."
    },
    SUBMIT: {
        SUMMARY: "Submit a z/OS job",
        DESCRIPTION: "Submit a job (JCL).",
        ACTIONS: {
            COMMON_OPT: {
                WAIT_FOR_ACTIVE: "Wait for the job to enter ACTIVE status before completing the command.",
                WAIT_FOR_OUTPUT: "Wait for the job to enter OUTPUT status before completing the command.",
                VIEW_ALL_SPOOL_CONTENT: "Print all spool output." +
                    " If you use this option you will wait for the job to complete.",
                DIRECTORY: "The local directory you would like to download the output of the job." +
                        " Creates a subdirectory using the jobID as the name and files are titled based on DD names." +
                        " If you use this option you will wait for the job to complete.",
                EXTENSION: "A file extension to save the job output with. Default is '.txt'.",
                JCL_SYMBOLS:  "A string of JCL symbols to use for substitution. " +
                    "For symbol values with no spaces: \"symbol1=value1 symbol2=value2 ...\". " +
                    "When a value contains spaces, enclose the value in single quotes: " +
                    "\"symbol1='value 1 with spaces' symbol2='value 2 with spaces' ...\". " +
                    "To embed a single quote in a value, use two single quotes: \"NAME=O''Brian\".",
                JOB_ENCODING: "The encoding that should be used to read the JCL into the z/OSMF JCL reader. " +
                    "JCL will be converted into this codepage from UTF-8 for the JES subsystem to parse.",
                JOB_RECORD_LENGTH: "The logical record length of the JCL being submitted.",
                JOB_RECORD_FORMAT: "The record format of the JCL being submitted, where V is variable, and F is fixed."
            },
            DATA_SET: {
                SUMMARY: "Submit a job contained in a data set",
                DESCRIPTION: "Submit a job (JCL) contained in a data set. The data set may be of type physical sequential or a " +
                    "PDS member. The command does not pre-validate the data set name. " +
                    "The command presents errors verbatim from the z/OSMF Jobs REST endpoints. " +
                    "For more information about z/OSMF Jobs API errors, see the z/OSMF Jobs API REST documentation.",
                POSITIONALS: {
                    DATASET: "The z/OS data set containing the JCL to submit. " +
                        "You can specify a physical sequential data set (for example, \"DATA.SET\") " +
                        "or a partitioned data set qualified by a member (for example, \"DATA.SET(MEMBER)\")."
                },
                OPTIONS: {
                    VOLUME: "The volume serial (VOLSER) where the data set resides. The option is required only when the data set is not" +
                        " catalogued on the system."
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Submit the JCL in the data set \"ibmuser.cntl(deploy)\"",
                        OPTIONS: "\"ibmuser.cntl(deploy)\""
                    },
                    EX2: {
                        DESCRIPTION: "Submit the JCL in the data set \"ibmuser.cntl(deploy)\", wait for the job to " +
                        "complete and print all output from the job",
                        OPTIONS: "\"ibmuser.cntl(deploy)\" --view-all-spool-content"
                    }
                }
            },
            USS_FILE: {
                SUMMARY: "Submit a job contained in a USS file",
                DESCRIPTION: "Submit a job (JCL) contained in a USS file. The command does not pre-validate the USS file path. " +
                    "The command presents errors verbatim from the z/OSMF Jobs REST endpoints. " +
                    "For more information about z/OSMF Jobs API errors, see the z/OSMF Jobs API REST documentation.",
                POSITIONALS: {
                    USSFILE: "Path to the USS file that contains the JCL to submit."
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Submit the JCL in the USS file \"/a/ibmuser/compile.jcl\"",
                        OPTIONS: "\"/a/ibmuser/compile.jcl\""
                    },
                    EX2: {
                        DESCRIPTION: "Submit the JCL in the USS file \"/a/ibmuser/compile.jcl\", wait for the job to " +
                        "complete and print all output from the job",
                        OPTIONS: "\"/a/ibmuser/compile.jcl\" --view-all-spool-content"
                    }
                }
            },
            LOCAL_FILE: {
                SUMMARY: "Submit a job contained in a local file",
                DESCRIPTION: "Submit a job (JCL) contained in a local file. " +
                    "The command presents errors verbatim from the z/OSMF Jobs REST endpoints. " +
                    "For more information about z/OSMF Jobs API errors, see the z/OSMF Jobs API REST documentation.",
                POSITIONALS: {
                    NAME: "The local file containing the JCL to submit."
                },
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Submit the JCL in the file \"iefbr14.txt\"",
                        OPTIONS: "\"iefbr14.txt\""
                    }
                }
            },
            STDIN: {
                SUMMARY: "Submit a job read from standard in",
                DESCRIPTION: "Submit a job (JCL) passed to the command via the stdin stream. " +
                    "The command presents errors verbatim from the z/OSMF Jobs REST endpoints. " +
                    "For more information about z/OSMF Jobs API errors, see the z/OSMF Jobs API REST documentation.",
                EXAMPLES: {
                    EX1: {
                        DESCRIPTION: "Submit the JCL in the file \"iefbr14.txt\" via standard in",
                        OPTIONS: "< iefbr14.txt"
                    },
                    EX2: {
                        DESCRIPTION: "Submit the JCL in the file \"iefbr14.txt\" via standard in from the output of another command",
                        OPTIONS: "",
                        PREFIX: "cat iefbr14.txt |"
                    }
                }
            }
        }
    },
    VIEW: {
    }
};
