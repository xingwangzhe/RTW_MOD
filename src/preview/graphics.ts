import * as vscode from 'vscode';
import * as path from 'path';

interface mainbody {
    image: string;           // 图片路径
    image_back?: string;        // 总帧数
    image_wreak?: string;        //死亡图像
    image_shield?: string;        //护盾图像
    image_offsetX?: number;       // X轴偏移
    image_offsetY?: number;       // Y轴偏移
    isVisible?: boolean;        // 是否可见
    isVisbleToEnemies?: boolean;        // 是否对敌人可见
    teamColors?: boolean;        // 是否使用队伍颜色
     
}