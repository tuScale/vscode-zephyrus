import * as vscode from 'vscode';

export default class Command implements vscode.Disposable {
    public static async execute(command: string, ...rest: any[]) {
        return vscode.commands.executeCommand(command, ...rest);
    }

    private readonly innerRef: vscode.Disposable;

    public constructor(id: string, clb: (...args: any[]) => any) {
        this.innerRef = vscode.commands.registerCommand(id, clb);
    }

    dispose() {
        this.innerRef.dispose();
    }
}