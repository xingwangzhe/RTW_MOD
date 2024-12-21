
import * as vscode from 'vscode';
import * as mod from './mod_project_init';
import * as pth from './workspace';
import * as langs from './i18n';
import {ImagePreviewProvider} from './preview';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "rtw-mod" is now active!');
	langs.activate(context);
	const disposable = vscode.commands.registerCommand('rtw-mod.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from rtw_mod!');
	});
	const disposableCreateModProject = vscode.commands.registerCommand('rtw-mod.initmode', () => {
        mod.FirstStep(pth.getWorkspacePath());
    });
	const previewimages = vscode.commands.registerCommand('rtw-mod.openMyCustomView', () => {
		ImagePreviewProvider.createPreview(context);
	});

	context.subscriptions.push(disposable,disposableCreateModProject,previewimages);
}

// This method is called when your extension is deactivated
export function deactivate() {}
