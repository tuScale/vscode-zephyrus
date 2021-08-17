import * as vscode from 'vscode';
import UserCancelledFlowException from '../exceptions/UserCancelledFlowException';

import Board from "../models/Board";
import ZephyrusExtension from "../ZephyrusExtension";

export enum NoneSelectedNotificationResult {
    PickOne,
    Cancelled
}

export default class BoardSelector {
    public static readonly USE_DEFAULT_LABEL = "Use default";

    public constructor(readonly ze: ZephyrusExtension) {}
    
    public async showAndAwaitSelection() : Promise<Board> {
        let zSelectedBoardLabel: vscode.QuickPickItem | undefined; 
        let zBoardSelectorPlaceholder: string;
        const selectorOptions: vscode.QuickPickItem[] = [];
        const zBuildRuntime = await this.ze.getBuildRuntime()!;
        const zCurrentSelectedBoard = await this.ze.config.getTargetedBoard();
        const boardItems = zBuildRuntime.boards.map(board => <vscode.QuickPickItem>{
            label: board.name
        });
        let zSelectedBoard: Board;

        if (zCurrentSelectedBoard.isDefined()) {
            zBoardSelectorPlaceholder = `Currently selected board: ${zCurrentSelectedBoard.name}`;
            selectorOptions.push(<vscode.QuickPickItem>{
                label: BoardSelector.USE_DEFAULT_LABEL
            });
        } else {
            zBoardSelectorPlaceholder = "Select the targeted board";
        }
        selectorOptions.push(...boardItems);
        zSelectedBoardLabel = await vscode.window.showQuickPick(selectorOptions, {
            canPickMany: false,
            placeHolder: zBoardSelectorPlaceholder
        }); 

        if (!zSelectedBoardLabel) {
            throw new UserCancelledFlowException('User cancelled the board selection.');
        }

        if (BoardSelector.USE_DEFAULT_LABEL === zSelectedBoardLabel.label) {
            zSelectedBoard = zCurrentSelectedBoard;
        } else {
            zSelectedBoard = await Board.newFor(zSelectedBoardLabel.label);
        }

        return zSelectedBoard;
    }

    public async showNotificationOfNoneSelected(): Promise<NoneSelectedNotificationResult> {
        const actionPicked = await vscode.window.showErrorMessage("No board selected", {
            modal: true,
            detail: "Please click 'Pick one' to choose one."
        }, "Pick one");

        return actionPicked === "Pick one" ? NoneSelectedNotificationResult.PickOne : NoneSelectedNotificationResult.Cancelled;
    }
}