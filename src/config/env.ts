// .env 파일의 설정값을 읽습니다. 값이 없으면 1단계 기본값(로컬 · 샘플 AI · 데모)으로 동작합니다.

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

export const modeLabel = `${env.dataMode === 'local' ? '로컬 저장' : 'Firebase 저장'} · ${env.aiMode === 'mock' ? '샘플 AI' : 'Gemini AI'}`;
