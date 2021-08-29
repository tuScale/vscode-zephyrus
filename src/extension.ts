import * as vscode from 'vscode';

import ZephyrusExtension from './ZephyrusExtension';

let zExt: ZephyrusExtension;

export async function activate(context: vscode.ExtensionContext) {
	console.log('Activating Zephyrus');

	zExt = new ZephyrusExtension(context);
	await zExt.onActivation();

	console.log('Zephyrus is now active');
	return zExt;
}

export async function deactivate() {
	await zExt.onDeactivation();
}
