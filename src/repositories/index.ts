// 데이터 저장 위치를 고르는 곳입니다. 화면은 항상 여기서 repo 를 가져다 씁니다.
// .env 의 VITE_DATA_MODE 값: local(브라우저 저장) | firebase(3단계에서 추가)

import { env } from '../config/env';
import type { AppRepository } from './AppRepository';
import { LocalRepository } from './LocalRepository';

// 3단계에서 env.dataMode === 'firebase' 이면 FirebaseRepository 를 쓰도록 바뀝니다.
export const repo: AppRepository = new LocalRepository({ demo: env.demoMode });

export { RepositoryError, routineLogId } from './AppRepository';
export type { AppRepository } from './AppRepository';
