// 진짜 Gemini: 우리 서버(Netlify Function)를 거쳐 Gemini 를 부릅니다. 브라우저가 Gemini 에 직접 연결하지 않습니다.
// 사용자가 "AI 설정"에 넣은 API 키와 모델은 요청 헤더로 함께 보냅니다.

import { parseFeedback } from '../prompts/parseFeedback';
import { terms } from '../config/appConfig';
import { withJosa } from '../utils/josa';
import type { AiFeedback } from '../types';
import type { AiClient, FeedbackRequest, TutorRequest } from './aiClient';
import { AiError } from './AiError';

export interface AiConnection {
  apiKey: string;
  model: string;
  /** Firebase 로그인 토큰 (Firebase 모드에서만). 서버가 "우리 클래스 사람"인지 확인합니다. */
  idToken?: string | null;
  classId?: string | null;
}

const BASE = '/.netlify/functions';

export async function postFunction<T>(name: string, body: unknown, connection: AiConnection): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Gemini-Model': connection.model };
  if (connection.apiKey) headers['X-Gemini-Key'] = connection.apiKey;
  if (connection.idToken) headers.Authorization = `Bearer ${connection.idToken}`;
  const payload = connection.classId ? { ...(body as object), classId: connection.classId } : body;

  let response: Response;
  try {
    response = await fetch(`${BASE}/${name}`, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch {
    throw new AiError(`${withJosa(terms.aiName, '과', '와')} 연결이 안 돼요. 인터넷 연결을 확인해 주세요.`);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // JSON 이 아니면 아래에서 처리
  }
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;

  if (!response.ok) {
    if (typeof obj.error === 'string') throw new AiError(obj.error);
    if (response.status === 404) {
      throw new AiError('AI 서버(Netlify Functions)가 켜져 있지 않아요. "netlify dev"로 실행했는지 확인해 주세요.');
    }
    throw new AiError('AI가 잠깐 쉬고 있어요. 잠시 후 다시 시도해 주세요.');
  }
  return obj as T;
}

export class NetlifyAiClient implements AiClient {
  constructor(private getConnection: (purpose: 'feedback' | 'tutor') => AiConnection | Promise<AiConnection>) {}

  async getFeedback(request: FeedbackRequest): Promise<AiFeedback> {
    const data = await postFunction<{ feedback?: unknown }>('feedback', request, await this.getConnection('feedback'));
    return parseFeedback(data.feedback, request.assignment.rubric);
  }

  async askTutor(request: TutorRequest): Promise<string> {
    const data = await postFunction<{ answer?: unknown }>('tutor', request, await this.getConnection('tutor'));
    if (typeof data.answer !== 'string' || !data.answer.trim()) throw new AiError('튜터가 답을 만들지 못했어요. 다시 물어봐 줄래요?');
    return data.answer;
  }

  /** "AI 설정" 화면의 [키 확인] */
  async checkKey(): Promise<string> {
    const data = await postFunction<{ model?: unknown }>('check-key', {}, await this.getConnection('feedback'));
    return typeof data.model === 'string' ? data.model : '';
  }
}
