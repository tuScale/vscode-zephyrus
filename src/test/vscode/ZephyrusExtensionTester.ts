import * as sinon from 'sinon';
import * as vscode from 'vscode';

import ZephyrusConfig from '../../ZephyrusConfig';
import ZephyrusExtension from '../../ZephyrusExtension';

type ZephyrConfigInspect<T> = {
    defaultValue?: T;
    globalValue?: T;
    workspaceValue?: T,
    workspaceFolderValue?: T,

    defaultLanguageValue?: T;
    globalLanguageValue?: T;
    workspaceLanguageValue?: T;
    workspaceFolderLanguageValue?: T;

    languageIds?: string[];
} | undefined;
type ZephyrusExtensionCommand = string & { meta: 'Zephyrus Command' };
type ZephyrusTesterNotificationStubs = {
    error: sinon.SinonStub;
};
type ZephyrusTesterStubs = {
    messages: ZephyrusTesterNotificationStubs;
};

export interface ZephyrusExtensionEnvironmentOptions {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ZEPHYR_BASE: string | undefined
}

export interface ZephyrusSettings {
    basePath?: ZephyrConfigInspect<string>,
    zephyrBoard?: ZephyrConfigInspect<string>
}

export interface ZephyrusExtensionTesterOptions {
    env: ZephyrusExtensionEnvironmentOptions,
    settings: ZephyrusSettings,
    shouldDeactivateFirst?: boolean
}

export default class ZephyrusExtensionTester {
    public static readonly NEW_BOARD_PROJECT_COMMAND = 'zephyrus.newBoardProject' as ZephyrusExtensionCommand;

    public static async getFor(opts: ZephyrusExtensionTesterOptions) {
        let ze: ZephyrusExtension;
        const zExtension = vscode.extensions.getExtension('tuScale.zephyrus');

        // Prep up environment and wire-up sinon
        process.env = { ...process.env, ...opts.env };
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
            if (opts.shouldDeactivateFirst === undefined || opts.shouldDeactivateFirst) {
                await ze.onDeactivation();
            }
        } else {
            ze = await zExtension?.activate() as ZephyrusExtension;
        }
        if (!ze) {
            console.error("Could not get a hold of the Zephyrus extension.");
            throw new Error("Could not obtain reference to the Zephyrus extension instance");
        }

        return new ZephyrusExtensionTester(ze, opts.settings);
    }

    private constructor(public ze: ZephyrusExtension, readonly settings: ZephyrusSettings) {
        // No-op
    }

    public async test(whatToTest: (stubs: ZephyrusTesterStubs) => void) {
        const zeStubs = {
            messages: {
                error: sinon.stub(vscode.window, "showErrorMessage")
            }
        };

        await whatToTest(zeStubs);

        zeStubs.messages.error.resetHistory();
    }
}