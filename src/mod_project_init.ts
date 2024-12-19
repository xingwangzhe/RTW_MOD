import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import * as files from './templates/files';
import * as langs from './i18n';

const filesToCreate = files.files; 

export async function FirstStep(dir: string) {

    const currentDirName = path.basename(dir);
    const files = await fs.readdir(dir);

    const isEmptyDir = files.length === 0;

    let modName = isEmptyDir ? currentDirName : '';

    const userInput = await vscode.window.showInputBox({
        placeHolder: langs.translate('placeholder'),
        value: modName,
        prompt: !isEmptyDir ? langs.translate('nonEmptyFolderPrompt') : ''
    });

    modName = userInput && userInput.trim() ? userInput : (isEmptyDir ? currentDirName : '');

    if (modName) {
        const modDir = path.join(dir, modName);
        try {
            await fs.mkdir(modDir, { recursive: true });
            await CreateModProject(modDir, modName); 
        } catch (error) {
            console.error(langs.translate('modProjectCreationFailed')+`:${modDir}`, error);
        }
    } else {
        console.log(langs.translate('modNameNotProvided'));
    }
}


async function CreateModProject(modDir: string,modName:string) {
    for (const file of filesToCreate) {
        const filePath = path.join(modDir, file);
        const filename = path.basename(filePath);
        try {
            const directory = path.dirname(filePath);
            try {
                await fs.access(directory); 
            } catch {
                await fs.mkdir(directory, { recursive: true }); 
            }
            if (file.endsWith('/')) {
                await fs.mkdir(filePath, { recursive: true });
            } else {
                await fs.writeFile(filePath, '');
            }
        } catch (error) {
            console.error(langs.translate('fileCreationFailed')+`：${filePath}`, error);
        }
        if(filename ==='mod-info.txt'){
            const sourceFilePath = path.join(__dirname, '../src/templates/mod-info.txt');
            await fs.copyFile(sourceFilePath, filePath);
            let content = await fs.readFile(filePath, 'utf-8');
            const titleToAdd = modName; // 替换为你想添加的标题内容
            const modifiedContent = content.replace(/(title:)(.*)/, `$1 ${titleToAdd}`); 

            // 将修改后的内容写回文件
            await fs.writeFile(filePath, modifiedContent);
        }
    }

    console.log(langs.translate('modProjectCreated')+`：${modDir}`);
}