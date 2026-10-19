// Gemini 호출을 한곳에 모았습니다. (@google/genai SDK)
// 오류는 학생이 이해할 수 있는 쉬운 한국어로 바꿉니다.

import { ApiError, GoogleGenAI } from '@google/genai';
import { FriendlyError } from './http';

export interface GeminiTurn {
  role: 'user' | 'model';
  text: string;
}

export interface GeminiRequest {
  apiKey: string;
  model: string;
  system: string;
  turns: GeminiTurn[];
  json?: boolean; // true 면 JSON 으로만 답하게 합니다
  temperature?: number;
  maxOutputTokens?: number; // 답 길이 상한 (무료 사용량 아끼기)
}

export function toFriendlyError(error: unknown): FriendlyError {
  if (error instanceof FriendlyError) return error;
  const status = error instanceof ApiError ? error.status : 0;
  const message = error instanceof Error ? error.message : '';
  if (/api key not valid|API_KEY_INVALID|invalid api key/i.test(message) || status === 401) {
    return new FriendlyError(401, 'API 키가 올바르지 않아요. "AI 설정"에서 키를 다시 확인해 주세요.');
  }
  if (status === 403) return new FriendlyError(403, '이 API 키로는 Gemini를 쓸 수 없어요. 키 권한을 확인해 주세요.');
  if (status === 404) return new FriendlyError(404, '선택한 AI 모델을 찾을 수 없어요. "AI 설정"에서 다른 모델을 골라 주세요.');
  if (status === 429) return new FriendlyError(429, 'Gemini 무료 사용량이 잠시 꽉 찼어요. 1~2분 뒤에 다시 해 주세요. (계속되면 오늘 무료 한도를 다 쓴 거예요)');
  if (status === 400) return new FriendlyError(400, 'AI가 이 글을 처리하지 못했어요. 내용을 조금 바꿔서 다시 해 볼까요?');
  return new FriendlyError(502, 'AI 선생님과 연결이 잠깐 끊겼어요. 잠시 후 다시 시도해 주세요.');
}

export async function callGemini(request: GeminiRequest): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: request.apiKey });
    const response = await ai.models.generateContent({
      model: request.model,
      contents: request.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
      config: {
        systemInstruction: request.system,
        temperature: request.temperature ?? 0.6,
        ...(request.maxOutputTokens ? { maxOutputTokens: request.maxOutputTokens } : {}),
        ...(request.json ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const text = response.text?.trim() ?? '';
    if (!text) throw new FriendlyError(502, 'AI가 답을 만들지 못했어요. 다시 한 번 시도해 주세요.');
    return text;
  } catch (error) {
    throw toFriendlyError(error);
  }
}
