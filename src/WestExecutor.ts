import { spawn }  from 'child_process';
import { CancellationToken } from 'vscode';

import CommandNotFoundException from './exceptions/CommandNotFoundException';
import ZepyhrusConfig from './ZephyrusConfig';
import ZephyrusExtension from './ZephyrusExtension';

export type WestCommand = "--version" | "boards" | "build" | "flash";

// Following values are taken from: https://www.geeksforgeeks.org/exit-codes-in-c-c-with-examples/
const CMD_OK_CODE = 0;
const CMD_SERIOUS_ERR_CODE = 2;
const CMD_NOT_FOUND_ERR_CODE = 127;

export default class WestExecutor {
    public static readonly EXE_NAME = 'west';

    public static async new(ze: ZephyrusExtension, cancelToken: CancellationToken) : Promise<WestExecutor> {
        const westVersionChecker = WestExecutor._execute(ze.config, "--version")
            .then(westVersionRawResult => {
                const westVersionMatcherRegex = /West version: (.*)/i;
                const westVersionMatchedGroups = westVersionRawResult.match(westVersionMatcherRegex) || [];
                const westMatchedVersion = westVersionMatchedGroups.length > 1 ? westVersionMatchedGroups[1] : 'unknown';

                return new WestExecutor(ze, westMatchedVersion);
            });
        
        const cancelTokenPromise = new Promise<WestExecutor>((_, reject) => {
            cancelToken.onCancellationRequested(reject);
        });

        return Promise.race([ westVersionChecker, cancelTokenPromise ]);
    }

    private static _execute(config: ZepyhrusConfig, command: WestCommand, params: string[] = []): Promise<String> {
        return new Promise((accept, reject) => {
            let stdoutData: Buffer | null = null;
            const west = spawn(WestExecutor.EXE_NAME, [ command, ...params ], { 
                shell: process.env.SHELL,
                env: WestExecutor._getEnvironmentForWestExecution(config)
            });
            
            west.stdout.on('data', data => {
                if (!stdoutData) {
                    stdoutData = data;
                } else {
                    stdoutData = Buffer.concat([ stdoutData, data ]);
                }
            });
            west.stderr.on('data', data => {
                console.error(`WestExecutor stderr: ${data}`);
            });
            
            west.on('close', code => {
                if (code === CMD_OK_CODE) {
                    // No-op. Everything ok.
                    accept(stdoutData?.toString() ?? "");
                } else if (code === CMD_NOT_FOUND_ERR_CODE) {
                    reject(new CommandNotFoundException(WestExecutor.EXE_NAME));
                } else if (code === CMD_SERIOUS_ERR_CODE) {
                    /* TODO: now what? Eg of such an error exit code state:
                       [stderr] west: error: argument <command>: invalid choice: 'boards' (choose ...
                    */
                } else {
                    console.error(`West exited with an abnormal code ${code}.`);
                    reject();
                }
            });
        });
    }

    private static _getEnvironmentForWestExecution(config: ZepyhrusConfig): any {
        return {
            ...process.env,
            // Augment the CLI search path with the default one depicted in Zephyr's Getting Started guide so that we can make use of west
            //         https://docs.zephyrproject.org/latest/getting_started/index.html#get-zephyr-and-install-python-dependencies
            // TODO[#2]: Dinamically deduce west path
            // eslint-disable-next-line @typescript-eslint/naming-convention
            PATH: `~/.local/bin:${process.env.PATH}`,
            // eslint-disable-next-line @typescript-eslint/naming-convention
            ZEPHYR_BASE: config.zephyrBase
        };
    }
    
    private constructor(readonly ze: ZephyrusExtension, readonly version: string) {}

    public execute(command: WestCommand, params: string[] = []): Promise<String> {
        return WestExecutor._execute(this.ze.config, command, params);
    }
}