import { assert, expect } from 'chai';
import { Context } from 'mocha';
import * as sinon from 'sinon';

import ZephyrusExtension from '../../../ZephyrusExtension';
import VSCodeExtensionTester from '../VSCodeExtensionTester';

suite('New Board Project Flow', function () {
	test('Triggering a new board project flow should notify with an error if the Zephyr base path could not be deduced', async function (this: Context) {
		const zet = this.zTester as VSCodeExtensionTester;

		return zet.test(async (opts, zeStubs) => {
			delete process.env.ZEPHYR_BASE;
			opts.settings.basePath.reset();

			await zet.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

			assert.equal(zeStubs.messages.error.callCount, 1);
			assert.isTrue(zeStubs.messages.error.calledWith(sinon.match(/^Neither the 'ZEPHYR_BASE' environmental.*/)));
		});
	});

	test('Triggering a new board project should notify with a meaningfull error if ZEPHYR_BASE is set with a bad path', async function () {
		const zet = this.zTester as VSCodeExtensionTester;

		return zet.test(async (opts, zeStubs) => {
			process.env.ZEPHYR_BASE = '/some/non-existing/path';
			opts.settings.basePath.reset();

			await zet.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

			assert.equal(zeStubs.messages.error.callCount, 1);
			assert.isTrue(zeStubs.messages.error.calledWith(sinon.match(/^While present, it looks like the provided Zephyr base path is not valid.*/)));
		});
	});

	test('Triggering a new board project should show the board selector if Zephyr Base is properly set', async function () {
		const zet = this.zTester as VSCodeExtensionTester;

		return zet.test(async (opts, zeStubs) => {
			delete process.env.ZEPHYR_BASE;
			opts.settings.basePath.workspaceValue = zet.host.dependencies.zephyr.path;

			zet.ze.startFlow(ZephyrusExtension.NEW_PROJECT_FLOW);

			return Promise.race([
				new Promise<void>(accept => { setTimeout(() => accept(), 2000); }), 
				new Promise<void>((accept, reject) => {
					zeStubs.input.quickPick.callsFake((items, opts) => {
						try {
							expect(items).to.be.an.instanceof(Array);
							expect(items.length).itself.be.above(100);
							expect(opts).to.not.be.undefined;
							expect(opts.canPickMany, "allows for more than one board pick").to.be.false;
							accept();
						} catch(e) {
							reject(e);
						}
					});
				})
			]);
		});
	});
});