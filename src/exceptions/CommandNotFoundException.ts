import { MessageType } from "../models/MessageType";
import MessagebleException from "./MessagebleException";

function commandToReason(command: string) {
    return `${command} command line not found`;
}

export default class CommandNotFoundException extends MessagebleException {
    public constructor(readonly command: string) {
        super(MessageType.Error, commandToReason(command));
    }

    get reason() {
        return commandToReason(this.command);
    }
}