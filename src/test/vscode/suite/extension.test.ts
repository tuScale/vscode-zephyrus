import { assert } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import ZephyrusConfig from '../../../ZephyrusConfig';
import ZephyrusExtension from '../../../ZephyrusExtension';

suite('New Board Project', function () {
	test('Triggering a new board project flow should notify with an error if the Zephyr base path could not be deduced', async function () {
		const spiedShowErrorMessage = sinon.spy(vscode.window, "showErrorMessage");
		const zUnactivatedExtension = vscode.extensions.getExtension('tuScale.zephyrus');

		delete process.env.ZEPHYR_BASE;
		sinon.stub(vscode.workspace, "getConfiguration")
			.withArgs(ZephyrusExtension.CONFIG_SECTION_NAME)
			.returns({ 
				inspect: sinon.stub().withArgs(ZephyrusConfig.BASE_PATH_KEY.key).returns(undefined),
				get: sinon.stub().returns(""),
				has: sinon.stub(),
				update: sinon.stub()
			});

		const ze = await zUnactivatedExtension?.activate() as ZephyrusExtension;
		
		await ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

		assert.equal(spiedShowErrorMessage.callCount, 1);
		assert.isTrue(spiedShowErrorMessage.calledWith(sinon.match(/^Neither the 'ZEPHYR_BASE' environmental.*/)));
	});
});