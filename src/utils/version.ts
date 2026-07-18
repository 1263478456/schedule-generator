// 版本信息 - 从 version.txt 读取
import versionText from '../../version.txt';

export const APP_VERSION = versionText.trim() || '1.0.0';
export const APP_NAME = '智能排班表生成器';
