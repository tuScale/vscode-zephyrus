import { assert } from 'chai';
import * as sinon from 'sinon';

import ZephyrusExtension from '../../../ZephyrusExtension';
import ZephyrusExtensionTester from '../ZephyrusExtensionTester';

suite('New Board Project', function () {
	test('Triggering a new board project flow should notify with an error if the Zephyr base path could not be deduced', async function () {
		const zTester = await ZephyrusExtensionTester.newFor({
			env: {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				ZEPHYR_BASE: undefined,
			},
			settings: {
				basePath: undefined
			}
		});

		await zTester.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

		assert.equal(zTester.spies.messages.error.callCount, 1);
		assert.isTrue(zTester.spies.messages.error.calledWith(sinon.match(/^Neither the 'ZEPHYR_BASE' environmental.*/)));
	});
});