// Firebase 연결 (로그인 = Authentication, 데이터베이스 = Firestore)
// 설정값은 src/config/firebaseConfig.ts 에 있습니다. VITE_DATA_MODE=firebase 일 때만 사용돼요.

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../config/firebaseConfig';

const firstTime = getApps().length === 0;
export const firebaseApp = firstTime ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(firebaseApp);
// ignoreUndefinedProperties: 값이 없는(undefined) 항목은 저장할 때 자동으로 빼 줍니다.
export const db = firstTime ? initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true }) : getFirestore(firebaseApp);
