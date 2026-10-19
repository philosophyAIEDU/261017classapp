// .env 파일의 설정값을 읽습니다. (AI 모드는 처음 값일 뿐, 교사 "AI 설정" 화면에서 바꿀 수 있어요.) 값이 없으면 1단계 기본값(로컬 · 샘플 AI · 데모)으로 동작합니다.

export type DataMode = 'local' | 'firebase';
export type AiMode = 'mock' | 'gemini';

const rawData = import.meta.env.VITE_DATA_MODE;
const rawAi = import.meta.env.VITE_AI_MODE;
const rawDemo = import.meta.env.VITE_DEMO_MODE;

export const env = {
  dataMode: (rawData === 'firebase' ? 'firebase' : 'local') as DataMode,
  // AI 처음 값: 직접 정하지 않았다면 Firebase 모드(실제 수업)는 진짜 Gemini, 로컬 모드(연습)는 샘플 AI
  aiMode: (rawAi === 'gemini' || (rawAi === undefined && rawData === 'firebase') ? 'gemini' : 'mock') as AiMode,
  // 데모 모드(샘플 데이터 + 역할 전환)는 로컬 저장에서만 동작합니다.
  demoMode: (rawDemo === undefined ? true : rawDemo === 'true') && rawData !== 'firebase',
};
