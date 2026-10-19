// 데이터 저장 위치를 고르는 곳입니다. 화면은 항상 여기서 repo 를 가져다 씁니다.
// .env(또는 Netlify 환경변수)의 VITE_DATA_MODE 값: local(이 브라우저에 저장) | firebase(온라인 저장, 여러 기기에서 함께 사용)

import { env } from '../config/env';
import type { AppRepository } from './AppRepository';
import { FirebaseRepository } from './FirebaseRepository';
import { LocalRepository } from './LocalRepository';

export const repo: AppRepository = env.dataMode === 'firebase' ? new FirebaseRepository() : new LocalRepository({ demo: env.demoMode });

export { RepositoryError, routineLogId } from './AppRepository';
export type { AppRepository } from './AppRepository';
