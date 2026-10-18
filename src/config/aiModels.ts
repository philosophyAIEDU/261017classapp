// 쓸 수 있는 Gemini 모델 목록입니다. 화면(교사 설정)과 서버(Netlify Function)가 함께 씁니다.
// ✏️ 새 모델이 나오면 이 목록에 한 줄 추가하세요. 서버는 이 목록에 있는 모델만 허용합니다.

export const AI_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', description: '꼼꼼하고 똑똑해요. 글 첨삭에 추천' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', description: '빠르고 가벼워요. 튜터 대화에 추천' },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]['id'];

export const DEFAULT_FEEDBACK_MODEL: AiModelId = 'gemini-3.8-flash';
export const DEFAULT_TUTOR_MODEL: AiModelId = 'gemini-3.5-flash-lite';

export function isAllowedModel(id: unknown): id is AiModelId {
  return typeof id === 'string' && AI_MODELS.some((m) => m.id === id);
}
