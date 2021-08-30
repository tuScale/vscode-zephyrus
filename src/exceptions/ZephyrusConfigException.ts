import { MessageType } from "../models/MessageType";
import MessagebleException from "./MessagebleException";

export default class ZephyrusConfigException extends MessagebleException {
    constructor(reason: string) {
        super(MessageType.Error, reason);
    }
}