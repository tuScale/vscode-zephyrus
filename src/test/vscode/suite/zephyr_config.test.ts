import { assert } from 'chai';

import ZephyrusExtensionTester from '../ZephyrusExtensionTester';

suite('Zephyr Config', function () {
	test('Zephyr base setting values should overwrite environmental ones', async function () {
        const zet = await ZephyrusExtensionTester.instance();

		return zet.test(async (opts, _zeStubs) => {
			process.env.ZEPHYR_BASE = '/env/zephyr/base';
			opts.settings.basePath.workspaceValue = '/sett/zephyr/base';

            assert.equal(zet.ze.config.zephyrBase, opts.settings.basePath.workspaceValue);
		});
    });
});