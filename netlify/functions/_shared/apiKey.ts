// 어떤 Gemini API 키와 모델을 쓸지 정합니다.
// 1순위: 사용자가 앱 "AI 설정" 화면에 넣은 키 (요청 헤더 X-Gemini-Key 로 전달됨)
// 2순위: Netlify 환경변수 GEMINI_API_KEY (운영자가 넣어 둔 기본 키, 없어도 됨)
// 🔒 키는 이번 요청에서 Gemini 를 부를 때만 쓰고, 저장하거나 로그에 남기거나 응답에 넣지 않습니다.

import { DEFAULT_FEEDBACK_MODEL, DEFAULT_TUTOR_MODEL, isAllowedModel, type AiModelId } from '../../../src/config/aiModels';
import { FriendlyError } from './http';

export const KEY_HEADER = 'x-gemini-key';
export const MODEL_HEADER = 'x-gemini-model';

export function resolveApiKey(req: Request): string {
  const fromUser = req.headers.get(KEY_HEADER)?.trim() ?? '';
  if (!fromUser) {
    const fromEnv = process.env.GEMINI_API_KEY?.trim();
    if (fromEnv) return fromEnv;
    throw new FriendlyError(400, 'Gemini API 키가 아직 없어요. 선생님 화면의 "AI 설정"에서 키를 넣어 주세요.');
  }
  // Google API 키는 영문·숫자·-·_ 로 된 긴 문자열입니다.
  if (fromUser.length < 20 || fromUser.length > 200 || !/^[A-Za-z0-9_-]+$/.test(fromUser)) {
    throw new FriendlyError(400, 'API 키 모양이 올바르지 않아요. 복사한 키를 다시 붙여 넣어 주세요.');
  }
  return fromUser;
}

/** 요청한 모델이 허용 목록에 있으면 그것, 없으면 환경변수 → 기본값 */
export function resolveModel(req: Request, purpose: 'feedback' | 'tutor'): AiModelId {
  const requested = req.headers.get(MODEL_HEADER)?.trim();
  if (isAllowedModel(requested)) return requested;
  const fromEnv = (purpose === 'tutor' ? process.env.GEMINI_TUTOR_MODEL : process.env.GEMINI_MODEL)?.trim();
  if (isAllowedModel(fromEnv)) return fromEnv;
  return purpose === 'tutor' ? DEFAULT_TUTOR_MODEL : DEFAULT_FEEDBACK_MODEL;
}
