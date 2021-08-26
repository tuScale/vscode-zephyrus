import { spawn }  from 'child_process';
import { EventEmitter, Stream } from 'stream';

import * as vscode from 'vscode';

import CommandNotFoundException from './exceptions/CommandNotFoundException';
import { MessageType } from './models/MessageType';
import CallToUriActionMessage from './widgets/CallToUriActionMessage';
import ZepyhrusConfig from './ZephyrusConfig';
import ZephyrusExtension from './ZephyrusExtension';

// Following values are taken from: https://www.geeksforgeeks.org/exit-codes-in-c-c-with-examples/
const CMD_OK_CODE = 0;
const CMD_SERIOUS_ERR_CODE = 2;
const CMD_NOT_FOUND_ERR_CODE = 127;

interface CommandStream extends EventEmitter {
    stdout: Stream;
    stderr: Stream;
};

export class WestCommand {
    public static readonly BOARDS = new WestCommand("boards");
    public static readonly BUILD = new WestCommand("build");
    public static readonly FLASH = new WestCommand("flash");
    public static readonly VERSION = new WestCommand("--version");

    private constructor(readonly name: string) {}
}

type WestExecutionOptions = {
    command: WestCommand;
    params?: string[];
    stream?: boolean;
};

export class WestExecutionTerminal implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
	onDidWrite: vscode.Event<string> = this.writeEmitter.event;
    private closeEmitter = new vscode.EventEmitter<number>();
	onDidClose?: vscode.Event<number> = this.closeEmitter.event;
    
    constructor(
        private readonly we: WestExecutor, 
        private readonly command: WestCommand, 
        private readonly args: string[]) {}

    close(): void {
        // No-op
    }
    open(_initialDimensions: vscode.TerminalDimensions | undefined): void {
        const cmdStream = this.we.execute({ 
            command: this.command, 
            params: this.args,
            stream: true
        }) as CommandStream;

        cmdStream.stdout.on('data', data => {
            const dataAsString = data.toString().replaceAll("\n", "\r\n");

            this.writeEmitter.fire(dataAsString);
        });
        cmdStream.stderr.on('data', async (data) => {
            const dataAsString = data.toString().replaceAll("\n", "\r\n");

            if (dataAsString.includes("Could not find a package configuration file provided by \"Zephyr-sdk\"")) {
                CallToUriActionMessage.show(
                    MessageType.Error, 
                    "It looks like Zephyr SDK is not installed.", 
                    { text: "Install it", uri: "https://docs.zephyrproject.org/latest/getting_started/index.html#install-a-toolchain" }, 
                    "Cancel"
                );
            } else if (dataAsString.includes("required program nrfjprog not found; install it or add its location to PATH")) {
                CallToUriActionMessage.show(
                    MessageType.Error, 
                    "It looks like the nRF Command Line Tools are not installed.", 
                    { text: "Install them", uri: "https://www.nordicsemi.com/Products/Development-tools/nRF-Command-Line-Tools/Download#infotabs" }, 
                    "Cancel"
                );
            } else if (dataAsString.includes("ERROR: JLinkARM DLL is invalid. Please reinstall latest JLinkARM DLL.")) {
                CallToUriActionMessage.show(
                    MessageType.Error, 
                    "It looks like the JLink CLI bridge is not installed.", 
                    { text: "Install it", uri: "https://www.segger.com/downloads/jlink/#J-LinkSoftwareAndDocumentationPack" }, 
                    "Cancel"
                );
            }
            this.writeEmitter.fire(dataAsString);
        });
        cmdStream.on('close', _code => {
            this.closeEmitter.fire(0);
        });
    }
}

export default class WestExecutor {
    public static readonly EXE_NAME = 'west';

    public static async new(ze: ZephyrusExtension, cancelToken: vscode.CancellationToken) : Promise<WestExecutor> {
        const westVersionChecker = (WestExecutor._execute(ze.config, { command: WestCommand.VERSION }) as Promise<String>)
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

    private static _execute(config: ZepyhrusConfig, opts: WestExecutionOptions): Promise<String> | CommandStream {
        const optsParams = opts.params === undefined ? [] : opts.params;
        const west = spawn(WestExecutor.EXE_NAME, [ opts.command.name, ...optsParams ], { 
            shell: process.env.SHELL,
            env: WestExecutor._getEnvironmentForWestExecution(config)
        });
        
        if (opts.stream) {
            return west;
        }

        return new Promise((accept, reject) => {
            let stdoutData: Buffer | null = null;

            west.stdout.on('data', data => {
                if (!stdoutData) {
                    stdoutData = data;
                } else {
                    stdoutData = Buffer.concat([ stdoutData, data ]);
                }
            });
            west.stderr.on('data', data => {
                // TODO: ?
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

    public execute(opts: WestExecutionOptions | WestCommand) {
        if (opts instanceof WestCommand) {
            return WestExecutor._execute(this.ze.config, { command: opts });
        }
        return WestExecutor._execute(this.ze.config, opts);
    }

    public getWestExecutionFor(command: WestCommand, args: string[]): vscode.CustomExecution {
        return new vscode.CustomExecution(async () => new WestExecutionTerminal(this, command, args));
    }
}