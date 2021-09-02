import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';
import TesterHost from '../../TesterHost';
import VSCodeExtensionTester from '../VSCodeExtensionTester';

export async function run(): Promise<void> {
	const mocha = new Mocha({
		ui: 'tdd',
        color: true,
		parallel: false
	});
	const testsRoot = path.resolve(__dirname, '..');
	const codePath = process.env.VSCODE_EXTENSION_DEVELOPMENT_PATH || path.resolve(__dirname, '../../../..');
	const testerHost = await TesterHost.newHaving(codePath);
	const zephyrTester = await VSCodeExtensionTester.instance(testerHost);

	return new Promise((c, e) => {
		glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
			if (err) {
				return e(err);
			}

			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				mocha.run(failures => {
					if (failures > 0) {
						e(new Error(`${failures} tests failed.`));
					} else {
						c();
					}
				}).addListener("test", function(this: Mocha.Runner) {
					this.test!.ctx!["zTester"] = zephyrTester;
				});
			} catch (err) {
				console.error(err);
				e(err);
			}
		});
	});
}