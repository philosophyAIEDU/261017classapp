// 기능(모듈)이 켜져 있는지: appConfig 에서 켜져 있고, 학급 설정에서도 켜져 있어야 합니다.

import { appConfig } from '../config/appConfig';
import type { ClassRoom, ModuleKey } from '../types';

export function isModuleOn(classRoom: ClassRoom | null, key: ModuleKey): boolean {
  if (!appConfig.modules[key]) return false;
  return classRoom ? classRoom.enabledModules.includes(key) : true;
}
