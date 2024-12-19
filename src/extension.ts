
import * as vscode from 'vscode';
import * as mod from './mod_project_init';
import * as pth from './workspace';
import * as langs from './i18n';



export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "rtw-mod" is now active!');
	langs.activate(context);
	const disposable = vscode.commands.registerCommand('rtw-mod.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from rtw_mod!');
	});
	const disposableCreateModProject = vscode.commands.registerCommand('rtw-mod.initmode', () => {
        mod.FirstStep(pth.getWorkspacePath());
    });

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
