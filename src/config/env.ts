// .env 파일의 설정값을 읽습니다. (AI 모드는 처음 값일 뿐, 교사 "AI 설정" 화면에서 바꿀 수 있어요.) 값이 없으면 1단계 기본값(로컬 · 샘플 AI · 데모)으로 동작합니다.

export type DataMode = 'local' | 'firebase';
export type AiMode = 'mock' | 'gemini';

const rawData = import.meta.env.VITE_DATA_MODE;
const rawAi = import.meta.env.VITE_AI_MODE;
const rawDemo = import.meta.env.VITE_DEMO_MODE;

export const env = {
  dataMode: (rawData === 'firebase' ? 'firebase' : 'local') as DataMode,
  aiMode: (rawAi === 'gemini' ? 'gemini' : 'mock') as AiMode,
  demoMode: rawDemo === undefined ? true : rawDemo === 'true',
};
