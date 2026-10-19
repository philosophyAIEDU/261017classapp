// Firebase 웹 앱 설정값입니다. (Firebase 콘솔 → 프로젝트 설정 → 내 앱 → SDK 설정 및 구성)
// ✏️ 내 Firebase 프로젝트를 쓰려면 아래 값을 내 값으로 바꾸세요. .env 의 VITE_FIREBASE_* 값이 있으면 그것을 먼저 씁니다.
// ℹ️ 이 값은 비밀번호가 아니라 "어느 Firebase 프로젝트인지" 알려 주는 공개 주소예요. 데이터 보호는 firestore.rules 가 맡습니다.
// ⚠️ Google Analytics(measurementId)는 쓰지 않습니다. (학생 앱에 추적 스크립트를 넣지 않기 위해)

const env: Partial<ImportMetaEnv> = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyAfeoHanopre3lKRZ16v6RhLl_a7c_kETc',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'classapp-c569a.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'classapp-c569a',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'classapp-c569a.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '221753646645',
  appId: env.VITE_FIREBASE_APP_ID || '1:221753646645:web:85eb32f1666e472eab1b7c',
};
