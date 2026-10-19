// AI 계층: 화면은 이 파일의 aiClient 만 씁니다.
// 교사 "AI 설정"(처음 값은 .env 의 VITE_AI_MODE)에 따라 샘플 AI(MockAiClient) 또는 진짜 Gemini(NetlifyAiClient)를 고릅니다.

import { repo } from '../repositories';
import { useAiSettings } from '../store/aiSettingsStore';
import { useSession } from '../store/sessionStore';
import type { AiFeedback, Assignment, TutorRoom } from '../types';
import { MockAiClient } from './MockAiClient';
import { NetlifyAiClient } from './NetlifyAiClient';

export interface FeedbackRequest {
  assignment: Pick<Assignment, 'title' | 'prompt' | 'rubric' | 'tone' | 'minChars' | 'maxChars'>;
  text: string;
}

export interface TutorRequest {
  room: Pick<TutorRoom, 'topic' | 'persona' | 'teacherInstruction'>;
  history: { role: 'student' | 'tutor'; text: string }[];
  message: string;
}

export interface AiClient {
  /** 과제 글 → 루브릭 피드백 */
  getFeedback(request: FeedbackRequest): Promise<AiFeedback>;
  /** 튜터에게 질문 → 답변 글 */
  askTutor(request: TutorRequest): Promise<string>;
}

export { AiError } from './AiError';

const mockClient = new MockAiClient();

export const geminiClient = new NetlifyAiClient(async (purpose) => {
  const s = useAiSettings.getState();
  return {
    apiKey: s.apiKey,
    model: purpose === 'tutor' ? s.tutorModel : s.feedbackModel,
    idToken: repo.getIdToken ? await repo.getIdToken() : null,
    classId: useSession.getState().user?.classId ?? null,
  };
});

function current(): AiClient {
  return useAiSettings.getState().mode === 'gemini' ? geminiClient : mockClient;
}

export const aiClient: AiClient = {
  getFeedback: (request) => current().getFeedback(request),
  askTutor: (request) => current().askTutor(request),
};
