import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

let languagePack: { [key: string]: string } = {};

export function activate(context: vscode.ExtensionContext) {
    const lang = vscode.env.language; // 获取当前语言
    const langFilePath = path.join(context.extensionPath, 'i18n', `${lang}.json`);

    // 检查确实加载语言包
    if (fs.existsSync(langFilePath)) {
        languagePack = JSON.parse(fs.readFileSync(langFilePath, 'utf8'));
    } else {
        // 如果没有找到对应的语言包，使用默认语言包
        const defaultLangFilePath = path.join(context.extensionPath, 'i18n', 'en.json');
        languagePack = JSON.parse(fs.readFileSync(defaultLangFilePath, 'utf8'));
    }
}

export function deactivate() {
    // 插件停用时的清理逻辑
}

// 翻译函数，接收一个键并返回相应的翻译
export function translate(key: string): string {
    return languagePack[key] || key; // 获取翻译内容，默认返回 key
}

