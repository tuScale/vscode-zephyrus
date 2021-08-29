import * as vscode from 'vscode';

import Board from "./models/Board";

type PotentialStringToAnyMapper = (val: string | undefined) => any;

class ZephyrConfigKey {
    static newFor(key: string, 
        valIfMissing: string | undefined,
        mapValueToInstance: PotentialStringToAnyMapper | undefined = undefined): ZephyrConfigKey {
        let toReturn: ZephyrConfigKey;

        if (mapValueToInstance) {
            toReturn = new ZephyrConfigKey(key, valIfMissing, mapValueToInstance);
        } else {
            toReturn = new ZephyrConfigKey(key, valIfMissing, val => val);
        }
        return toReturn;
    }

    private constructor(
        readonly key: string,
        readonly valIfMissing: string | undefined,
        public mapValueToInstance: (val: string | undefined) => any) {}
}

export class ZephyrusConfigException {
    constructor(readonly reason: string) {}
}

export default class ZepyhrusConfig {
    public static readonly BASE_PATH_KEY = ZephyrConfigKey.newFor('zephyr.base', process.env.ZEPHYR_BASE);
    public static readonly BOARD_KEY = ZephyrConfigKey.newFor('zephyr.board', Board.NO_BOARD.name, val => Board.newFor(val));
    public static readonly ZEPHYR_BASE_MISSING_MESSAGE = `Neither the 'ZEPHYR_BASE' environmental variable nor the '${ZepyhrusConfig.BASE_PATH_KEY.key}' path option has been set. We need to know the path to Zephyr in order to continue.`;

    private readonly zConfig: vscode.WorkspaceConfiguration;

    public constructor(private readonly configSection: string) {
        this.zConfig = vscode.workspace.getConfiguration(configSection);
    }

    get zephyrBase(): String {
        const configuredPath = this._getConfig(ZepyhrusConfig.BASE_PATH_KEY);
        const zephyrBasePath = configuredPath ?? process.env.ZEPHYR_BASE;

        if (!zephyrBasePath) {
            throw new ZephyrusConfigException(ZepyhrusConfig.ZEPHYR_BASE_MISSING_MESSAGE);
        }
        return zephyrBasePath;
    }

    async getTargetedBoard() : Promise<Board> {
        const configedBoardName = this._getConfig(ZepyhrusConfig.BOARD_KEY);

        return Board.newFor(configedBoardName);
    }
    async setTargetedBoard(val: Board) {
        await this.zConfig.update(ZepyhrusConfig.BOARD_KEY.key, val.name);
    }

    async onConfigurationChange(which: ZephyrConfigKey, clb: (newValue: any) => any) {
        vscode.workspace.onDidChangeConfiguration(async e => {
            if (e.affectsConfiguration(`${this.configSection}.${which.key}`)) {
                const newConfigValue = this._getConfig(which);

                clb(await which.mapValueToInstance(newConfigValue));
            }
        });
    }

    private _getConfig(config: ZephyrConfigKey): string | undefined {
        const inspectedValue = this.zConfig.inspect<string>(config.key);

        return inspectedValue?.defaultValue ??
            inspectedValue?.globalValue ??
            inspectedValue?.workspaceValue ??
            inspectedValue?.workspaceFolderValue ??
            config.valIfMissing;
    }
}