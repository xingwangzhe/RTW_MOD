import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

interface ImageAttributes {
    fileName: string;           // 图片文件名
    totalFrames: number;        // 总帧数
    currentFrame: number;       // 当前帧
    scaleTo: number;            // 缩放至指定像素
    x: number;                  // X坐标
    y: number;                  // Y 坐标
    type: 'main' | 'turret';    // 图层类型
    section: string;            // 所属节
    attachedTo?: number;        // 附加到哪个炮塔
}

interface LayerInfo {
    main: ImageAttributes;
    turrets: ImageAttributes[];
}

export class ImagePreviewProvider {
    private static parseImageAttributes(content: string, section: string): ImageAttributes | null {
        // 如果section不是graphics或不是以turret_开头，返回null
        if (section !== 'graphics' && !section.startsWith('turret_')) {
            return null;
        }

        // 改进炮塔节的有效性检查
        if (section.startsWith('turret_')) {
            // 1. 必须有image属性且不为空或NONE
            const imageMatch = content.match(/^image:.*?([^\n\r]+)/m);
            if (!imageMatch || !imageMatch[1].trim() || 
                ['NONE', 'none', 'blank.png'].includes(imageMatch[1].trim().replace(/^SHARED:/, ''))) {
                console.log(`跳过无图片炮塔: ${section}`);
                return null;
            }

            // 2. 检查是否是弹药发射器（有projectile属性且有canShoot:true）
            if (content.includes('projectile:') && content.includes('canShoot:true')) {
                console.log(`跳过弹药发射器: ${section}`);
                return null;
            }

            // 3. 检查是否明确标记为隐形
            if (content.includes('invisible:true') || content.includes('slave:true')) {
                console.log(`跳过隐形/从属炮塔: ${section}`);
                return null;
            }
        }

        const attributes: ImageAttributes = {
            fileName: '',
            totalFrames: 1,
            currentFrame: 0,
            scaleTo: 0,
            x: 0,
            y: 0,
            type: section === 'graphics' ? 'main' : 'turret',
            section: section
        };

        // 解析文件名 - 修改文件名解析逻辑
        const imageMatch = content.match(/^image.*?:\s*([^\n\r]+)/m) || content.match(/^image:\s*([^\n\r]+)/m);
        if (imageMatch) {
            attributes.fileName = imageMatch[1].trim().replace(/^SHARED:/, '');
            console.log(`[${section}] 处理后的图片文件名: ${attributes.fileName}`);
        }

        // 解析总帧数
        const framesMatch = content.match(/total_frames:\s*(\d+)/);
        if (framesMatch) {
            attributes.totalFrames = parseInt(framesMatch[1]);
            console.log(`[${section}] 总帧数: ${attributes.totalFrames}`);
        }

        // 解析缩放
        if (section === 'graphics') {
            const scaleMatch = content.match(/scaleImagesTo:\s*(\d+)/);
            if (scaleMatch) {
                attributes.scaleTo = parseInt(scaleMatch[1]);
                console.log(`[${section}] 缩放像素: ${attributes.scaleTo}`);
            }
        } else {
            const scaleTurretMatch = content.match(/scaleTurretImagesTo:\s*(\d+)/);
            if (scaleTurretMatch) {
                attributes.scaleTo = parseInt(scaleTurretMatch[1]);
                console.log(`[${section}] 炮塔缩放像素: ${attributes.scaleTo}`);
            }
        }

        // 解析坐标
        const xMatch = content.match(/x:\s*(-?\d+)/);
        const yMatch = content.match(/y:\s*(-?\d+)/);
        if (xMatch) attributes.x = parseInt(xMatch[1]);
        if (yMatch) attributes.y = parseInt(yMatch[1]);
        console.log(`[${section}] 坐标: (${attributes.x}, ${attributes.y})`);

        // 解析 attachedTo
        const attachedToMatch = content.match(/attachedTo:\s*(\d+)/);
        if (attachedToMatch) {
            attributes.attachedTo = parseInt(attachedToMatch[1]);
            console.log(`[${section}] 附加到炮塔: ${attributes.attachedTo}`);
        }

        return attributes;
    }

    private static parseIniContent(filePath: string): LayerInfo {
        console.log('开始解析INI文件:', filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log('文件内容:', content); // 打印整个文件内容

        const layerInfo: LayerInfo = {
            main: {
                fileName: '',
                totalFrames: 1,
                currentFrame: 0,
                scaleTo: 0,
                x: 0,
                y: 0,
                type: 'main',
                section: 'graphics'
            },
            turrets: []
        };

        // 解析[graphics]节
        const graphicsMatch = content.match(/\[graphics\]([\s\S]*?)(?=\[|$)/);
        if (graphicsMatch) {
            console.log('找到 [graphics] 节');
            console.log('节内容:', graphicsMatch[1]);
            const mainAttributes = this.parseImageAttributes(graphicsMatch[1], 'graphics');
            if (mainAttributes) {
                layerInfo.main = mainAttributes;
            }
        }

        // 改进炮塔节匹配
        const allSections = content.split(/\[/);
        allSections.forEach(section => {
            const turretMatch = section.match(/^turret_(\d+)\]/);
            if (turretMatch) {
                const turretNum = parseInt(turretMatch[1]);
                console.log(`尝试解析炮塔 ${turretNum}:`);
                const turretContent = section.substring(section.indexOf(']') + 1);
                const turretAttributes = this.parseImageAttributes(turretContent, `turret_${turretNum}`);
                if (turretAttributes) {
                    console.log(`成功解析炮塔 ${turretNum}`);
                    layerInfo.turrets.push(turretAttributes);
                }
            }
        });

        console.log('有效炮塔数量:', layerInfo.turrets.length);
        layerInfo.turrets.forEach((turret, index) => {
            console.log(`炮塔 ${index + 1}:`, turret);
        });

        return layerInfo;
    }
    private static getZoomControlHtml(): string {
        return `
            <script>
                let scale = 1;
                const container = document.querySelector('.preview-area');
                
                document.addEventListener('wheel', (e) => {
                    if (e.ctrlKey) {
                        e.preventDefault();
                        
                        // 计算缩放比例
                        const delta = e.deltaY > 0 ? 0.9 : 1.1;
                        scale = Math.min(Math.max(0.1, scale * delta), 5);
                        
                        // 应用缩放
                        container.style.transform = \`scale(\${scale})\`;
                        
                        // 更新显示的缩放比例
                        document.getElementById('zoomLevel').textContent = \`缩放: \${Math.round(scale * 100)}%\`;
                    }
                }, { passive: false });
            </script>
        `;
    }
    public static createPreview(context: vscode.ExtensionContext) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const iniPath = editor.document.uri.fsPath;
        const basePath = path.dirname(iniPath);
        const layerInfo = this.parseIniContent(iniPath);

        const panel = vscode.window.createWebviewPanel(
            'imagePreview',
            '单位预览',
            vscode.ViewColumn.Two,
            { enableScripts: true }
        );

        const getLayerPosition = (attr: ImageAttributes): { x: number, y: number } => {
            if (!attr.attachedTo) {
                return { x: attr.x, y: attr.y };
            }

            // 找到父炮塔
            const parentTurret = layerInfo.turrets[attr.attachedTo - 1];
            if (!parentTurret) {
                return { x: attr.x, y: attr.y };
            }

            // 递归计算位置
            const parentPos = getLayerPosition(parentTurret);
            return {
                x: parentPos.x + attr.x,
                y: parentPos.y + attr.y
            };
        };

        const getLayerHtml = (attr: ImageAttributes, isMain: boolean = false) => {
            const position = getLayerPosition(attr);
            const imagePath = path.join(basePath, attr.fileName);
            
            // 计算显示宽度和容器宽度
            const displayWidth = attr.scaleTo;
            const containerWidth = displayWidth / attr.totalFrames;

            return `
                <div class="layer-container ${attr.type}-container" 
                    style="position: absolute; 
                        ${isMain ? 'left: 50%; top: 50%;' : 'left: calc(50% + ' + position.x + 'px); top: calc(50% + ' + position.y + 'px);'}
                        transform: translate(-50%, -50%);
                        width: ${containerWidth}px;
                        height: auto;
                        overflow: hidden;
                        pointer-events: none;">
                    <img 
                        class="layer ${attr.type}"
                        src="${panel.webview.asWebviewUri(vscode.Uri.file(imagePath))}"
                        style="
                            width: ${displayWidth}px;
                            height: auto;
                            display: block;
                            transform: translateX(-${attr.currentFrame * containerWidth}px);
                        "
                    />
                </div>
            `;
        };

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <style>
                        .container {
                            position: relative;
                            width: 100%;
                            height: 100vh;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                        }
                        .preview-area {
                            position: relative;
                            flex: 1;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            transform-origin: center center;
                            transition: transform 0.1s ease-out;
                        }
                        .zoom-info {
                            position: fixed;
                            bottom: 10px;
                            right: 10px;
                            background: rgba(0,0,0,0.5);
                            color: white;
                            padding: 5px 10px;
                            border-radius: 4px;
                            font-size: 12px;
                            z-index: 1000;
                        }
                        .layer {
                            transform-origin: center;
                        }
                        .main { z-index: 1; }
                        .turret { z-index: 2; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="preview-area">
                            ${getLayerHtml(layerInfo.main, true)}
                            ${layerInfo.turrets.map(turret => getLayerHtml(turret)).join('')}
                        </div>
                        <div id="zoomLevel" class="zoom-info">缩放: 100%</div>
                    </div>
                    ${this.getZoomControlHtml()}
                </body>
            </html>
        `;
    }
}
