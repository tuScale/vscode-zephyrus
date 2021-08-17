import * as vscode from 'vscode';

import UserCancelledFlowException from '../exceptions/UserCancelledFlowException';
import Command from '../models/Command';
import ZephyrProjectCreator from '../ZephyrProjectCreator';

import ZephyrusExtension from "../ZephyrusExtension";
import Flow from './Flow';

export default class NewProjectFlow extends Flow {
    public constructor(readonly ze: ZephyrusExtension) {
        super();
    }

    public async tryMounting(): Promise<boolean> {
        const commandTrigger = new Command('zephyrus.newBoardProject', async () => { await this.start(); });

        this.ze.register(commandTrigger);
        return true;
    }

    protected override async _start() {
		const projectName = await this._inputProjectName();
		const zephyrBoard = await this.ze.boardSelector.showAndAwaitSelection();
		const selectedFolder = await this._inputProjectPath();
        const projectFolder = `${selectedFolder}/${projectName}`;

		await ZephyrProjectCreator.create(selectedFolder, projectName, zephyrBoard);
        await this._open(projectFolder, this.ze.isAnyProjectOpened());
    }

    private async _open(path: string, forceNewWindow: boolean = false) {
        await Command.execute("vscode.openFolder", vscode.Uri.file(path), { forceNewWindow });
    }

    private async _inputProjectName(): Promise<string> {
        const projectName = await vscode.window.showInputBox({
			placeHolder: "Let's start of with a name ...",
			title: "New Zephyr board project",
			validateInput: candidateName => candidateName.match(/^[a-z0-9-\\._]+$/i) ? "" : 
				"Currently, only alpha-numerical characters, '-', '.' and '_' are accepted"
		});

		if (projectName === undefined) {
			throw new UserCancelledFlowException('User cancelled new project creation at name-picking step.');
		}
        return projectName;
    }

    private async _inputProjectPath(): Promise<string> {
        const selectedFolder = await vscode.window.showOpenDialog({
			canSelectFolders: true,
			title: "Select output folder",
			openLabel: "Create"
		});
		
		if (selectedFolder === undefined) {
			throw new UserCancelledFlowException('User cancelled new project creation at folder-path selection step.');
		}
        return selectedFolder[0].fsPath;
    }
}