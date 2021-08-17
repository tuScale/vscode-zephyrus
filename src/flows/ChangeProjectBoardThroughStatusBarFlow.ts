import * as vscode from 'vscode';

import BoardSelectedStatusBarItem from "../widgets/BoardSelectedStatusBarItem";
import ZepyhrusConfig from '../ZephyrusConfig';
import ZephyrusExtension from "../ZephyrusExtension";
import Flow from './Flow';

export default class ChangeProjectBoardThroughStatusBarFlow extends Flow {
    private boardSelectedStatusBarItem: BoardSelectedStatusBarItem;

    public constructor(readonly ze: ZephyrusExtension) {
        super();
        
        this.boardSelectedStatusBarItem = new BoardSelectedStatusBarItem(ze, "boardSelectedStatusBarItem", vscode.StatusBarAlignment.Left, 1);
        this.ze.config.onConfigurationChange(ZepyhrusConfig.BOARD_KEY, newBoard => this.boardSelectedStatusBarItem.select(newBoard));
    }

    public override async tryMounting(): Promise<boolean> {
        let wasItMounted = false;

        if (await this.ze.isZephyrProject()) {
            const currentSelectedBoard = await this.ze.config.getTargetedBoard();

            this.boardSelectedStatusBarItem.select(currentSelectedBoard);
            this.boardSelectedStatusBarItem.doOnClicked(async () => { await this.start(); });
            wasItMounted = true;
        }
        return wasItMounted;
    }

    protected async _start() {
        const selectedBoard = await this.ze.boardSelector.showAndAwaitSelection();

        await this.ze.config.setTargetedBoard(selectedBoard);
    }
}