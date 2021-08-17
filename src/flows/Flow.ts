import events = require("events");
import UserCancelledFlowException from "../exceptions/UserCancelledFlowException";

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
            // TODO: No-op for 'UserCancelledFlowException', what about the rest?
            if (e instanceof UserCancelledFlowException) {
                return FlowExecutionResult.Aborted;
            }
        }
        return FlowExecutionResult.Errored;
    }
    public abstract tryMounting(): Promise<boolean>;

    protected abstract _start() : any;
}