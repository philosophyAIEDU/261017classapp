// AI가 돌려준 글(JSON)을 앱이 쓰는 피드백 모양으로 바꿉니다.
// JSON이 깨졌거나 항목이 빠져도 앱이 멈추지 않도록 기본 문구로 채웁니다.

import type { AiFeedback, RubricCriterion, RubricResult } from '../types';

// ✏️ 선생님이 바꿔도 되는 부분: AI 응답이 이상할 때 대신 보여 줄 기본 문구
export const FALLBACK_FEEDBACK = {
  praise: '끝까지 글을 완성한 점이 정말 멋져요!',
  improvement: '한 문장씩 소리 내어 읽어 보고, 더 자세히 쓰고 싶은 부분을 찾아보세요.',
  rubricComment: 'AI가 이 기준을 판단하지 못했어요. 선생님이 확인해 주실 거예요.',
  question: '이 글을 읽는 친구가 가장 궁금해할 점은 무엇일까요?',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** 코드블록(```json ... ```)이나 앞뒤 잡담이 섞여 있어도 { ... } 부분만 꺼냅니다. */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

function clampLevel(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(3, Math.max(1, Math.round(n)));
}

/**
 * AI 응답 → AiFeedback
 * @param raw  AI가 보낸 글(문자열) 또는 이미 JSON으로 바뀐 값
 * @param rubric 과제 루브릭. 주면 기준 이름 순서대로 맞춰 줍니다.
 */
export function parseFeedback(raw: unknown, rubric: RubricCriterion[] = []): AiFeedback {
  const data = typeof raw === 'string' ? extractJson(raw) : raw;
  const obj = isRecord(data) ? data : {};

  const praise = cleanText(obj.praise) || FALLBACK_FEEDBACK.praise;

  const improvements = Array.isArray(obj.improvements)
    ? obj.improvements.map(cleanText).filter((s) => s.length > 0).slice(0, 3)
    : [];
  if (improvements.length === 0) improvements.push(FALLBACK_FEEDBACK.improvement);

  const aiRubric: RubricResult[] = Array.isArray(obj.rubric)
    ? obj.rubric.filter(isRecord).map((r) => ({
        criterion: cleanText(r.criterion),
        level: clampLevel(r.level),
        comment: cleanText(r.comment) || FALLBACK_FEEDBACK.rubricComment,
      }))
    : [];

  let finalRubric: RubricResult[];
  if (rubric.length > 0) {
    // 과제 루브릭 순서대로, 이름이 같은 항목을 찾아 넣습니다. 없으면 같은 순서의 항목, 그것도 없으면 기본값.
    finalRubric = rubric.map((c, i) => {
      const found = aiRubric.find((r) => r.criterion === c.name) ?? aiRubric[i];
      return found
        ? { criterion: c.name, level: found.level, comment: found.comment }
        : { criterion: c.name, level: 1, comment: FALLBACK_FEEDBACK.rubricComment };
    });
  } else {
    finalRubric = aiRubric.filter((r) => r.criterion.length > 0);
  }

  const question = cleanText(obj.question) || FALLBACK_FEEDBACK.question;

  return { praise, improvements, rubric: finalRubric, question };
}
