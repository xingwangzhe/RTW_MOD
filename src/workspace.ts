
import * as vscode from 'vscode';
export function getWorkspacePath() {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (workspaceFolders && workspaceFolders.length > 0) {
        // 返回第一个工作区文件夹的路径
        return workspaceFolders[0].uri.fsPath;
    } else {
        // 如果没有工作区的情况下，可以返回当前文件的路径
        return vscode.workspace.rootPath || '';
    }
}

// 使用示例
export const workspacePath = getWorkspacePath();