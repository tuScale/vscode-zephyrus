import * as vscode from 'vscode';
import Board from '../models/Board';
import Command from '../models/Command';

import ZephyrusExtension from "../ZephyrusExtension";
import Widget from './Widget';

export default class BoardSelectedStatusBarItem extends Widget {
    readonly model: vscode.StatusBarItem;

    constructor(private readonly ze: ZephyrusExtension, 
        id: string = "boardSelectedStatusBarItem", alignment?: vscode.StatusBarAlignment, priority?: number) {
        super();
        this.model = vscode.window.createStatusBarItem(id, alignment, priority);
        this.model.command = `${this.model.id}.clicked`;
        this.ze.register(this.model);
    }

    public override dispose() {
        this.model.dispose();
    }

    doOnClicked(clb: () => void) : BoardSelectedStatusBarItem {
        const itemClickedVsCodeCommand = new Command(`${this.model.id}.clicked`, clb);

        this.ze.register(itemClickedVsCodeCommand);
        return this;
    }

    select(board: Board) {
        this.model.text = `Zephyr Board: ${board.name}`;
        this.model.show();
    }
}