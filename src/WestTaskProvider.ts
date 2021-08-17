import { access } from "fs/promises";
import * as fs from 'fs';

import * as vscode from "vscode";
import ZephyrusExtension from "./ZephyrusExtension";
import path = require("path");
import { NoneSelectedNotificationResult } from "./widgets/BoardSelector";
import { FlowExecutionResult } from "./flows/Flow";

interface WestTaskDefinition extends vscode.TaskDefinition {
	/**
	 * The command name
	 */
	command: "build" | "flash";
}

export default class WestTaskProvider implements vscode.TaskProvider {
    private westTaks: vscode.Task[] | undefined = undefined;

    constructor(readonly ze: ZephyrusExtension) {}

    public provideTasks(_token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        if (!this.westTaks) {
            this.westTaks = this._getWestTasks();
        }
        return this.westTaks;
    }
    public async resolveTask(task: vscode.Task, _token: vscode.CancellationToken): Promise<vscode.Task | undefined> {
        let taskToRun;
        const definition = <WestTaskDefinition>task.definition;
        let board = await this.ze.config.getTargetedBoard();
        
        if (!board.isDefined()) {
            const notifyResult = await this.ze.boardSelector.showNotificationOfNoneSelected();

            switch(notifyResult) {
                case NoneSelectedNotificationResult.PickOne:
                    const flowExResult = await this.ze.startFlow(ZephyrusExtension.CHANGE_PROJECT_BOARD_FLOW);

                    if (FlowExecutionResult.Completed === flowExResult) {
                        board = await this.ze.config.getTargetedBoard();
                    } else {
                        return this._newNoOpTaskFrom(task);
                    }
                    break;
                case NoneSelectedNotificationResult.Cancelled:
                default:
                    return this._newNoOpTaskFrom(task);
            }
        }
        
        const projectBuildDir = `build/${board.name}`;
        const workspaceFolderPath = (<vscode.WorkspaceFolder>task.scope).uri.fsPath;

        switch(definition.command) {
            case "build":
                taskToRun = new vscode.Task(definition, 
                    task.scope ?? vscode.TaskScope.Workspace, 
                    definition.command, 'west', 
                    new vscode.ShellExecution(`west build -b ${board.name} -d ${projectBuildDir}`));
                break;
            case "flash":
                let flashShellCmd = 'west flash';

                try {
                    await access(path.join(workspaceFolderPath, projectBuildDir), fs.constants.F_OK);   
                    flashShellCmd = `${flashShellCmd} -d ${projectBuildDir}`;
                } catch(e) {
                    // No-op
                }
                taskToRun = new vscode.Task(definition, 
                    task.scope ?? vscode.TaskScope.Workspace, 
                    definition.command, 'west', 
                    new vscode.ShellExecution(flashShellCmd));
                break;
        }
        taskToRun.runOptions = {
            reevaluateOnRerun: true
        };
        return taskToRun;
    }

    private _getWestTasks(): vscode.Task[] {
        return [
            new vscode.Task(
                { type: 'west', command: 'build' },
                vscode.TaskScope.Workspace,
                'build project', 'west',
                new vscode.ShellExecution("west build")
            ),
            new vscode.Task(
                { type: 'west', command: 'flash' },
                vscode.TaskScope.Workspace,
                'flash project', 'west',
                new vscode.ShellExecution("west flash")
            )
        ];
    }

    private _newNoOpTaskFrom(task: vscode.Task) {
        const newTask = new vscode.Task(task.definition, 
            vscode.TaskScope.Workspace, 
            task.name, task.source,
            new vscode.ProcessExecution("echo"));

        newTask.isBackground = true;
        newTask.presentationOptions = {
            reveal: vscode.TaskRevealKind.Never
        };
        return newTask;
    }
}