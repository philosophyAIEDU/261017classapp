// AI 첨삭 함수: 학생 글 + 루브릭 → Gemini → 피드백 JSON
// 주소: POST /.netlify/functions/feedback

import { appConfig, terms } from '../../src/config/appConfig';
import { buildFeedbackPrompt } from '../../src/prompts/feedbackPrompt';
import { parseFeedback } from '../../src/prompts/parseFeedback';
import type { FeedbackTone, RubricCriterion } from '../../src/types';
import { checkAiAccess } from './_shared/aiAccess';
import { resolveApiKey, resolveModel } from './_shared/apiKey';
import { callGemini } from './_shared/gemini';
import { asString, errorResponse, FriendlyError, json, readJsonBody } from './_shared/http';

export const MAX_TEXT_CHARS = appConfig.ai.maxInputChars;

function cut(value: unknown, max: number): string {
  return asString(value).trim().slice(0, max);
}

/** 루브릭을 안전한 모양으로 정리 (기준 1~5개, 단계 설명 3개) */
export function sanitizeRubric(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 5)
    .map((c: unknown) => {
      const obj = (typeof c === 'object' && c !== null ? c : {}) as Record<string, unknown>;
      const levels = Array.isArray(obj.levels) ? obj.levels : [];
      return {
        name: cut(obj.name, 60),
        levels: [cut(levels[0], 200), cut(levels[1], 200), cut(levels[2], 200)] as [string, string, string],
      };
    })
    .filter((c) => c.name.length > 0);
}

export default async function handler(req: Request): Promise<Response> {
  try {
    const body = await readJsonBody(req);
    const assignment = (typeof body.assignment === 'object' && body.assignment !== null ? body.assignment : {}) as Record<string, unknown>;
    const text = asString(body.text).trim();
    if (!text) throw new FriendlyError(400, '글을 먼저 써 주세요.');
    if (text.length > MAX_TEXT_CHARS) {
      throw new FriendlyError(413, `글은 ${MAX_TEXT_CHARS.toLocaleString()}자까지 보낼 수 있어요. 조금 줄여 주세요.`);
    }
    const rubric = sanitizeRubric(assignment.rubric);
    if (rubric.length === 0) throw new FriendlyError(400, `이 과제에는 평가 기준이 없어요. ${terms.teacher}께 알려 주세요.`);
    const tone: FeedbackTone = assignment.tone === 'editor' ? 'editor' : 'coach';

    const access = await checkAiAccess(req, body, 'feedback');
    const apiKey = resolveApiKey(req, access.allowEnvKey);
    const model = resolveModel(req, 'feedback');
    await access.consume();
    const prompt = buildFeedbackPrompt({ title: cut(assignment.title, 100), prompt: cut(assignment.prompt, 1500), rubric, tone, text });

    const raw = await callGemini({ apiKey, model, system: prompt.system, turns: [{ role: 'user', text: prompt.user }], json: true, temperature: 0.4, maxOutputTokens: appConfig.ai.freeTier.maxOutputTokens.feedback });
    return json(200, { feedback: parseFeedback(raw, rubric), model });
  } catch (error) {
    return errorResponse(error);
  }
}
