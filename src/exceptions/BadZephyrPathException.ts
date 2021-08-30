import { MessageType } from "../models/MessageType";
import MessagebleException from "./MessagebleException";

export default class BadZephyrPathException extends MessagebleException {
    public constructor(reason: string) {
        super(MessageType.Error, reason);
    }
}