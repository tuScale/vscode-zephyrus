import { MessageType } from "../models/MessageType";
import { UriActionLabel } from "../widgets/CallToUriActionMessage";

export default class MessagebleException {
    public constructor(
        readonly type: MessageType, 
        readonly text: string,
        readonly actions: (string | UriActionLabel)[] = []) {}
}