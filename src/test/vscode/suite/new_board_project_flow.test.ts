import { assert } from 'chai';
import * as sinon from 'sinon';

import ZephyrusExtension from '../../../ZephyrusExtension';
import ZephyrusExtensionTester from '../ZephyrusExtensionTester';

suite('New Board Project Flow', function () {
	test('Triggering a new board project flow should notify with an error if the Zephyr base path could not be deduced', async function () {
		const zet = await ZephyrusExtensionTester.instance();

		return zet.test(async (opts, zeStubs) => {
			delete process.env.ZEPHYR_BASE;
			opts.settings.basePath.reset();

			await zet.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

			assert.equal(zeStubs.messages.error.callCount, 1);
			assert.isTrue(zeStubs.messages.error.calledWith(sinon.match(/^Neither the 'ZEPHYR_BASE' environmental.*/)));
		});
	});

	test('Triggering a new board project should notify with a meaningfull error if ZEPHYR_BASE is set with a bad path', async function () {
		const zet = await ZephyrusExtensionTester.instance();

		return zet.test(async (opts, zeStubs) => {
			process.env.ZEPHYR_BASE = '/some/non-existing/path';
			opts.settings.basePath.reset();

			await zet.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

			assert.equal(zeStubs.messages.error.callCount, 1);
			assert.isTrue(zeStubs.messages.error.calledWith(sinon.match(/^While present, it looks like the provided Zephyr base path is not valid.*/)));
		});
	});
});