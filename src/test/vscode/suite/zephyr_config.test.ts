import { assert } from 'chai';

import VSCodeExtensionTester from '../VSCodeExtensionTester';

suite('Zephyr Config', function () {
	test('Zephyr base setting values should overwrite environmental ones', async function () {
        const zet = this.zTester as VSCodeExtensionTester;

		return zet.test(async (opts, _zeStubs) => {
			process.env.ZEPHYR_BASE = '/env/zephyr/base';
			opts.settings.basePath.workspaceValue = '/sett/zephyr/base';

            assert.equal(zet.ze.config.zephyrBase, opts.settings.basePath.workspaceValue);
		});
    });
});