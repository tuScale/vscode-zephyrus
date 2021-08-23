import events = require("events");

import * as vscode from 'vscode';

import CommandNotFoundException from "../exceptions/CommandNotFoundException";
import UserCancelledFlowException from "../exceptions/UserCancelledFlowException";
import WestExecutor from "../WestExecutor";
import { ZephyrusConfigException } from "../ZephyrusConfig";

export enum FlowExecutionResult {
    Completed,
    Aborted,
    Errored
}

export default abstract class Flow extends events.EventEmitter {
    public async start() : Promise<FlowExecutionResult> {
        try {
            await this._start();

            return FlowExecutionResult.Completed;
        } catch (e) {
            if (e instanceof UserCancelledFlowException) {
                return FlowExecutionResult.Aborted;
            } else if (e instanceof CommandNotFoundException) {
                if (WestExecutor.EXE_NAME === e.command) {
                    // TODO: if we'll have more of these notifications, extract them in some utility class? 
                    vscode.window.showErrorMessage(
                        "The west meta-tool is required yet not available. This possibly means that other dependencies are also missing.", 
                        "Install them", "Cancel"
                    ).then(choice => {
                        if ("Install them" === choice) {
                            const zephyrGettingStartedUri = vscode.Uri.parse("https://docs.zephyrproject.org/latest/getting_started/index.html");
                            
                            vscode.commands.executeCommand("vscode.open", zephyrGettingStartedUri);
                        }
                    });
                }
            } else if (e instanceof ZephyrusConfigException) {
                vscode.window.showErrorMessage(e.reason);
            }
        }
        return FlowExecutionResult.Errored;
    }
    
    public abstract tryMounting(): Promise<boolean>;

    protected abstract _start() : any;
}