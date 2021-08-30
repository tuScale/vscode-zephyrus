import * as vscode from 'vscode';
import MessagebleException from '../exceptions/MessagebleException';

import { MessageType } from "../models/MessageType";

type MessageShower = (message: string, ...items: string[]) => Thenable<string | undefined>;

const DONT_SHOW_ANYTHING: MessageShower = () => Promise.resolve(undefined);

export type UriActionLabel = {
    text: string,
    uri: string
};

export default class CallToUriActionMessage {
    public static async show(type: MessageType, text: string, ...actions: (string | UriActionLabel)[]) {
        let notify: MessageShower;
        let displayedActions = actions.map(action => typeof action === "string" ? action : action.text);

        switch(type) {
            case MessageType.Error:
                notify = vscode.window.showErrorMessage;
                break;
            default:
                // TODO: log this? should never happen
                notify = DONT_SHOW_ANYTHING;
        }

        const answer = await notify(text, ...displayedActions);
        if (answer) {
            const selectedAction = actions.find(act => !(typeof act === "string") && act.text === answer);

            if (selectedAction) {
                const vsCodeUri = vscode.Uri.parse((selectedAction as UriActionLabel).uri);

                vscode.commands.executeCommand("vscode.open", vsCodeUri);
            }
        }
        return answer;
    }

    public static showException(e: MessagebleException) {
        return CallToUriActionMessage.show(e.type, e.text, ...e.actions);
    }
}