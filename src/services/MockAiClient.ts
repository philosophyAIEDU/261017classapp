// 샘플 AI: 인터넷·API 키 없이 그럴듯한 답을 1.5초 뒤에 돌려줍니다. (1단계 · 수업 시연용)

import type { AiFeedback, RubricCriterion } from '../types';
import type { AiClient, FeedbackRequest, TutorRequest } from './aiClient';

const DELAY_MS = 1500;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstSentence(text: string): string {
  const s = text.trim().split(/(?<=[.!?。])\s+|\n+/)[0] ?? '';
  return s.length > 40 ? `${s.slice(0, 40)}…` : s;
}

/** 글 길이와 문단 수로 대략적인 수준을 정하는 샘플 규칙 */
export function buildMockFeedback(text: string, rubric: RubricCriterion[], minChars: number): AiFeedback {
  const length = text.trim().length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const hasReason = /왜냐하면|때문|because|이유/.test(text);
  const hasExperience = /나도|내가|저도|제가|경험|I /.test(text);

  let base = 1;
  if (length >= minChars * 1.5 || paragraphs >= 3) base = 3;
  else if (length >= minChars) base = 2;

  const opening = firstSentence(text);

  return {
    praise: opening
      ? `"${opening}"로 시작하는 첫 문장이 읽는 사람의 관심을 끌어요. ${hasReason ? '생각의 이유를 밝혀 쓴 점도 훌륭해요.' : '끝까지 성실하게 완성한 점이 멋져요.'}`
      : '과제를 끝까지 완성한 점이 멋져요.',
    improvements: [
      hasReason ? '이유 뒤에 구체적인 예시를 하나 더 붙이면 훨씬 설득력이 생겨요.' : '생각을 쓴 문장 뒤에 "왜냐하면"으로 이유를 덧붙여 보세요.',
      paragraphs < 3 ? '처음·가운데·끝으로 문단을 나누면 글의 흐름이 더 잘 보여요.' : '문단과 문단을 잇는 연결어(그래서, 하지만)를 넣어 보세요.',
      hasExperience ? '마지막 문단에서 앞으로의 다짐이나 바람을 한 문장으로 정리해 보세요.' : '나의 경험을 한 가지 떠올려 글과 연결해 보세요.',
    ],
    rubric: rubric.map((c, i) => {
      const level = Math.min(3, Math.max(1, base + (i === 1 && hasExperience ? 1 : 0) - (i === 2 && length < minChars ? 1 : 0)));
      return {
        criterion: c.name,
        level,
        comment: `"${c.levels[level - 1]}" 수준이에요. ${level < 3 ? `다음 단계: "${c.levels[level]}"에 도전해 봐요.` : '최고 단계예요!'}`,
      };
    }),
    question: hasExperience
      ? '만약 친구가 정반대의 경험을 했다면, 그 친구는 이 글을 읽고 어떤 생각을 할까요?'
      : '이 글의 내용이 나의 일상과 어떻게 연결될 수 있을까요?',
  };
}

/** 튜터 샘플 답변: 정답 대신 힌트와 되묻기 */
export function buildMockTutorReply(topic: string, message: string): string {
  const offTopic = /게임|아이돌|욕|연애|유튜버|웹툰|롤|배그/.test(message);
  if (offTopic) {
    return `그 이야기도 재미있겠지만, 지금은 "${topic}" 시간이야. 😊 오늘 배운 내용 중에 아직 헷갈리는 부분이 있니?`;
  }
  if (/답|알려줘|정답|식|뭐야|뭐예요/.test(message)) {
    return `좋은 질문이야! 바로 답을 말해 주기보다 같이 생각해 보자. "${topic}"에서 꼭 필요한 재료나 조건을 하나씩 떠올려 볼래? 첫 번째 힌트는 교과서 그림 속에 있어.`;
  }
  if (/왜/.test(message)) {
    return '오, "왜"를 묻는 건 탐구의 시작이야! 네가 생각하는 이유를 먼저 한 가지 말해 줄래? 그다음에 그 생각이 맞는지 함께 확인해 보자.';
  }
  return `흥미로운 생각이야. 그렇게 생각한 근거가 뭐야? "${topic}"에서 배운 내용 중 하나와 연결해서 설명해 볼래?`;
}

export class MockAiClient implements AiClient {
  async getFeedback(request: FeedbackRequest): Promise<AiFeedback> {
    await wait(DELAY_MS);
    return buildMockFeedback(request.text, request.assignment.rubric, request.assignment.minChars);
  }

  async askTutor(request: TutorRequest): Promise<string> {
    await wait(DELAY_MS);
    return buildMockTutorReply(request.room.topic, request.message);
  }
}
