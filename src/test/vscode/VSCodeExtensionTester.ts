import * as sinon from 'sinon';
import * as vscode from 'vscode';

import ZephyrusConfig from '../../ZephyrusConfig';
import ZephyrusExtension from '../../ZephyrusExtension';
import TesterHost from '../TesterHost';
import ZephyrusExtensionTester from '../ZephyrusExtensionTester';

type ZephyrusExtensionCommand = string & { meta: 'Zephyrus Command' };
type ZephyrusTesterInputStubs = {
    quickPick: sinon.SinonStub;
};
type ZephyrusTesterNotificationStubs = {
    error: sinon.SinonStub;
};
type ZephyrusTesterStubs = {
    input: ZephyrusTesterInputStubs;
    messages: ZephyrusTesterNotificationStubs;
};

class ZephyrConfigInspect<T> {
    defaultValue?: T;
    globalValue?: T;
    workspaceValue?: T;
    workspaceFolderValue?: T;

    defaultLanguageValue?: T;
    globalLanguageValue?: T;
    workspaceLanguageValue?: T;
    workspaceFolderLanguageValue?: T;

    public reset() {
        this.defaultLanguageValue = undefined;
        this.globalValue = undefined;
        this.workspaceValue = undefined;
        this.defaultLanguageValue = undefined;
        this.globalLanguageValue = undefined;
        this.workspaceFolderLanguageValue = undefined;
    }
};

export class ZephyrusSettings {
    readonly basePath = new ZephyrConfigInspect<string>();
    readonly zephyrBoard = new ZephyrConfigInspect<string>();

    public reset() {
        this.basePath.reset();
        this.zephyrBoard.reset();
    }
}

export class ZephyrusExtensionTesterOptions {
    readonly settings = new ZephyrusSettings();

    public reset() {
        this.settings.reset();
    }
}

export default class VSCodeExtensionTester implements ZephyrusExtensionTester {
    public static readonly NEW_BOARD_PROJECT_COMMAND = 'zephyrus.newBoardProject' as ZephyrusExtensionCommand;

    private static ZET: VSCodeExtensionTester | undefined;

    public static async instance(host: TesterHost): Promise<VSCodeExtensionTester> {
        const zExtension = vscode.extensions.getExtension('tuScale.zephyrus');

        if (!VSCodeExtensionTester.ZET) {
            let ze: ZephyrusExtension;
            let opts = new ZephyrusExtensionTesterOptions();

            // Wire-up sinon
            sinon.stub(vscode.workspace, "getConfiguration")
                .withArgs(ZephyrusExtension.CONFIG_SECTION_NAME)
                .returns({ 
                    inspect: sinon.stub()
                        .withArgs(ZephyrusConfig.BASE_PATH_KEY.key).returns(opts.settings.basePath),
                    get: sinon.stub().returns(""),
                    has: sinon.stub(),
                    update: sinon.stub()
                });

            if (zExtension?.isActive) {
                ze = zExtension.exports;
            } else {
                ze = await zExtension?.activate() as ZephyrusExtension;
            }
            if (!ze) {
                console.error("Could not get a hold of the Zephyrus extension.");
                throw new Error("Could not obtain reference to the Zephyrus extension instance");
            }
            
            VSCodeExtensionTester.ZET = new VSCodeExtensionTester(host, ze, opts);
        }
        return VSCodeExtensionTester.ZET;
    }

    private readonly sinonSandbox = sinon.createSandbox();
    private readonly stubs = {
        input: {
            quickPick: this.sinonSandbox.stub(vscode.window, "showQuickPick")
        },
        messages: {
            error: this.sinonSandbox.stub(vscode.window, "showErrorMessage")
        }
    };

    private constructor(
        public readonly host: TesterHost,
        public ze: ZephyrusExtension, 
        readonly opts: ZephyrusExtensionTesterOptions) {
        // No-op
    }

    public async test(whatToTest: (opts: ZephyrusExtensionTesterOptions, stubs: ZephyrusTesterStubs) => void) {
        await whatToTest(this.opts, this.stubs);

        // Cleanup
        this.sinonSandbox.resetHistory();
        this.opts.reset();
        await this.ze.onDeactivation();
    }
}