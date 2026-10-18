// API 키 확인 함수: "AI 설정" 화면의 [키 확인] 버튼이 부릅니다. 아주 짧은 질문 하나로 키와 모델이 동작하는지 봅니다.
// 주소: POST /.netlify/functions/check-key

import { resolveApiKey, resolveModel } from './_shared/apiKey';
import { callGemini } from './_shared/gemini';
import { errorResponse, json, readJsonBody } from './_shared/http';

export default async function handler(req: Request): Promise<Response> {
  try {
    await readJsonBody(req);
    const apiKey = resolveApiKey(req);
    const model = resolveModel(req, 'feedback');
    await callGemini({ apiKey, model, system: '한 단어로만 답한다.', turns: [{ role: 'user', text: '"좋아요"라고만 답해 줘.' }], temperature: 0 });
    return json(200, { ok: true, model });
  } catch (error) {
    return errorResponse(error);
  }
}
