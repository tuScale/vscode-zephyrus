import { readFile } from 'fs/promises';

import * as CMake from 'peg-cmake';
import * as vscode from 'vscode';

import ChangeProjectBoardThroughStatusBarFlow from './flows/ChangeProjectBoardThroughStatusBarFlow';
import Flow from './flows/Flow';

import NewProjectFlow from './flows/NewProjectFlow';
import Command from './models/Command';
import WestTaskProvider from './WestTaskProvider';
import BoardSelector from './widgets/BoardSelector';
import Widget from './widgets/Widget';
import ZephyrBuildRuntime from './ZephyrBuildRuntime';
import ZepyhrusConfig from './ZephyrusConfig';

export type FlowType = Symbol;

export default class ZephyrusExtension {
    public static readonly CHANGE_PROJECT_BOARD_FLOW = Symbol.for("ChangeProjectBoardThroughStatusBarFlow");
    public static readonly NEW_PROJECT_FLOW = Symbol.for("NewProjectFlow");

    readonly boardSelector: BoardSelector;
    private buildRuntime: ZephyrBuildRuntime | null = null;
    readonly config: ZepyhrusConfig;
    private flows = new Map<FlowType, Flow>();
    private readonly westTaskProvider: vscode.Disposable;
    
    public constructor(private readonly vsCodeContext: vscode.ExtensionContext) {
        this.boardSelector = new BoardSelector(this);
        this.config = new ZepyhrusConfig('zephyrus');
        this.westTaskProvider = vscode.tasks.registerTaskProvider('west', new WestTaskProvider(this));
    }

    async onActivation() {
        await this._loadFlowsInto(this.flows);
        try {
            const flowInstances = [...this.flows.values()];

            await Promise.all(flowInstances.map(flow => flow.tryMounting()));   
        } catch(e) {
            console.error(`Registering flows has failed: ${e.message}`, e.stack);
        }
    }

    async onDeactivation() {
        this.westTaskProvider.dispose();
    }

    get zephyrBasePath(): string {
        const configuredPath = this.config.zephyrPath;
        const envPath = process.env["ZEPHYR_BASE"];
        const zephyrBasePath = configuredPath ? configuredPath : envPath;

        if (!zephyrBasePath) {
            // TODO: throw a meaningfull error here since we don't know how to reach Zephyr
            throw new Error();
        }
        return zephyrBasePath;
    }

    public register(entity: Widget | Command) {
        this.vsCodeContext.subscriptions.push(entity);
    }

    public startFlow(which: FlowType) {
        const selectedFlow = this.flows.get(which);

        if (!selectedFlow) {
            throw new Error(`No such flow available: '${which}'`);
        }
        return selectedFlow.start();
    }

    async getBuildRuntime() {
        if (!this.buildRuntime) {
            // try {
                this.buildRuntime = await vscode.window.withProgress({
                    cancellable: true,
                    location: vscode.ProgressLocation.Notification,
                    title: "Checking environment sanity"
                }, await ZephyrBuildRuntime.initialize(this));
            // } catch (e) {
            //     if (e instanceof UserCancelledFlowException) {
            //         console.warn(e.reason);
            //     } else {
            //         console.warn(`Could not instantiate build-time due to an error occuring: ${e}`);
            //     }
            // }
        }
        return this.buildRuntime;
    }

    public isAnyProjectOpened(): boolean {
        return vscode.workspace.workspaceFolders !== undefined;
    }

    async isZephyrProject() : Promise<boolean> {
        return this.isAnyProjectOpened() && this._isFindingZephyrPackageByCMake();
    }

    private async _isFindingZephyrPackageByCMake() : Promise<boolean> {
        const folderPath = vscode.workspace.workspaceFolders![0].uri.fsPath;
        const cmakeContent = await readFile(`${folderPath}/CMakeLists.txt`, { encoding: 'utf-8' });
        const cmakeAst = CMake.parse(cmakeContent);
        
        return cmakeAst.find(el => {
            return el.type === 'command_invocation' && 
                (el as any).identifier.type === 'identifier' &&
                (el as any).identifier.value === 'find_package' &&
                (el as any).arguments[0].value === 'Zephyr';
        }) !== undefined;
    }

    private async _loadFlowsInto(flows: Map<FlowType, Flow>): Promise<void> {
        // "change project board through status bar"
        let changeProjectBoardThroughStatusBarFlow = new ChangeProjectBoardThroughStatusBarFlow(this);
        flows.set(ZephyrusExtension.CHANGE_PROJECT_BOARD_FLOW, changeProjectBoardThroughStatusBarFlow);

        // "new project"
        let newProjectFlow = new NewProjectFlow(this);
        flows.set(ZephyrusExtension.NEW_PROJECT_FLOW, newProjectFlow);
    }
}