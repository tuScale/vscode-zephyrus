import * as sinon from 'sinon';
import * as vscode from 'vscode';

import ZephyrusConfig from '../../ZephyrusConfig';
import ZephyrusExtension from '../../ZephyrusExtension';

type ZephyrusExtensionCommand = string & { meta: 'Zephyrus Command' };
type ZephyrusTesterNotificationStubs = {
    error: sinon.SinonStub;
};
type ZephyrusTesterStubs = {
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

export default class ZephyrusExtensionTester {
    public static readonly NEW_BOARD_PROJECT_COMMAND = 'zephyrus.newBoardProject' as ZephyrusExtensionCommand;

    private static ZET: ZephyrusExtensionTester | undefined;

    public static async instance(): Promise<ZephyrusExtensionTester> {
        const zExtension = vscode.extensions.getExtension('tuScale.zephyrus');

        if (!ZephyrusExtensionTester.ZET) {
            let ze: ZephyrusExtension;
            let opts = new ZephyrusExtensionTesterOptions();

            // Wire-up sinon
            sinon.stub(vscode.workspace, "getConfiguration")
                .withArgs(ZephyrusExtension.CONFIG_SECTION_NAME)
                .returns({ 
                    inspect: sinon.stub().withArgs(ZephyrusConfig.BASE_PATH_KEY.key).returns(opts.settings.basePath),
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
    
            ZephyrusExtensionTester.ZET = new ZephyrusExtensionTester(ze, opts);
        }
        return ZephyrusExtensionTester.ZET;
    }

    private constructor(public ze: ZephyrusExtension, readonly opts: ZephyrusExtensionTesterOptions) {
        // No-op
    }

    public async test(whatToTest: (opts: ZephyrusExtensionTesterOptions, stubs: ZephyrusTesterStubs) => void) {
        const zeStubs = {
            messages: {
                error: sinon.stub(vscode.window, "showErrorMessage")
            }
        };

        await whatToTest(this.opts, zeStubs);

        // Cleanup
        zeStubs.messages.error.restore();
        this.opts.reset();
        await this.ze.onDeactivation();
    }
}