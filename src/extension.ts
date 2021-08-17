import * as vscode from 'vscode';

import ZephyrusExtension from './ZephyrusExtension';

let Z_EXT: ZephyrusExtension;

export async function activate(context: vscode.ExtensionContext) {
	console.log('Activating Zephyrus');

	Z_EXT = new ZephyrusExtension(context);
	await Z_EXT.onActivation();

	console.log('Zephyrus is now active');
}

export async function deactivate() {
	await Z_EXT.onDeactivation();
}
