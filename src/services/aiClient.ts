// AI 계층: 화면은 이 파일의 aiClient 만 씁니다.
// .env 의 VITE_AI_MODE 값에 따라 샘플 AI(MockAiClient) 또는 진짜 Gemini(NetlifyAiClient, 2단계)를 고릅니다.

import type { AiFeedback, Assignment, TutorRoom } from '../types';
import { MockAiClient } from './MockAiClient';

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

/** 학생에게 보여 줄 쉬운 오류 */
export class AiError extends Error {}

// 2단계에서 env.aiMode === 'gemini' 이면 NetlifyAiClient 를 쓰도록 바뀝니다.
export const aiClient: AiClient = new MockAiClient();
