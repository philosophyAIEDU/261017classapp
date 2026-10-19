// AI 탐구 튜터 함수: 튜터 방 설정 + 대화 기록 + 새 질문 → Gemini → 힌트 답변
// 주소: POST /.netlify/functions/tutor

import { buildTutorSystemPrompt } from '../../src/prompts/tutorPrompt';
import { checkAiAccess } from './_shared/aiAccess';
import { resolveApiKey, resolveModel } from './_shared/apiKey';
import { callGemini, type GeminiTurn } from './_shared/gemini';
import { asString, errorResponse, FriendlyError, json, readJsonBody } from './_shared/http';

export const MAX_QUESTION_CHARS = 500;
const MAX_HISTORY_TURNS = 10;
const MAX_HISTORY_CHARS = 4000;

/** 대화 기록을 Gemini 형식으로: 최근 10개, 전체 4,000자 이내, 첫 순서는 학생, 같은 역할이 이어지면 합침 */
export function buildTurns(history: unknown, message: string): GeminiTurn[] {
  const items = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
  const turns: GeminiTurn[] = [];
  let total = 0;
  for (const item of items.reverse()) {
    const obj = (typeof item === 'object' && item !== null ? item : {}) as Record<string, unknown>;
    const text = asString(obj.text).trim().slice(0, 1000);
    if (!text) continue;
    if (total + text.length > MAX_HISTORY_CHARS) break;
    total += text.length;
    turns.unshift({ role: obj.role === 'tutor' ? 'model' : 'user', text });
  }
  turns.push({ role: 'user', text: message });
  while (turns.length > 1 && turns[0].role === 'model') turns.shift();
  return turns.reduce<GeminiTurn[]>((acc, t) => {
    const last = acc[acc.length - 1];
    if (last && last.role === t.role) last.text = `${last.text}\n${t.text}`;
    else acc.push({ ...t });
    return acc;
  }, []);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const body = await readJsonBody(req);
    const room = (typeof body.room === 'object' && body.room !== null ? body.room : {}) as Record<string, unknown>;
    const message = asString(body.message).trim();
    if (!message) throw new FriendlyError(400, '질문을 먼저 써 주세요.');
    if (message.length > MAX_QUESTION_CHARS) throw new FriendlyError(413, `질문은 ${MAX_QUESTION_CHARS}자까지 쓸 수 있어요.`);
    const topic = asString(room.topic).trim().slice(0, 60);
    if (!topic) throw new FriendlyError(400, '튜터 방 정보가 없어요. 다시 들어와 주세요.');

    const access = await checkAiAccess(req, body, 'tutor');
    const apiKey = resolveApiKey(req, access.allowEnvKey);
    const model = resolveModel(req, 'tutor');
    await access.consume();
    const system = buildTutorSystemPrompt({
      topic,
      persona: asString(room.persona).trim().slice(0, 80) || '친절한 탐구 튜터',
      teacherInstruction: asString(room.teacherInstruction).trim().slice(0, 600),
    });

    const answer = await callGemini({ apiKey, model, system, turns: buildTurns(body.history, message), temperature: 0.7 });
    return json(200, { answer, model });
  } catch (error) {
    return errorResponse(error);
  }
}
