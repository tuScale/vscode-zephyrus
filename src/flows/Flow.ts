import events = require("events");

import CommandNotFoundException from "../exceptions/CommandNotFoundException";
import UserCancelledFlowException from "../exceptions/UserCancelledFlowException";
import { MessageType } from "../models/MessageType";
import WestExecutor from "../WestExecutor";
import CallToUriActionMessage from "../widgets/CallToUriActionMessage";
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
                    CallToUriActionMessage.show(
                        MessageType.Error, 
                        "The west meta-tool is required yet not available. This possibly means that other dependencies are also missing.", 
                        { text: "Install them", uri: "https://docs.zephyrproject.org/latest/getting_started/index.html" }, 
                        "Cancel"
                    );
                }
            } else if (e instanceof ZephyrusConfigException) {
                CallToUriActionMessage.show(MessageType.Error, e.reason);
            }
        }
        return FlowExecutionResult.Errored;
    }
    
    public abstract tryMounting(): Promise<boolean>;

    protected abstract _start() : any;
}