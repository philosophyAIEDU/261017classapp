import { buildFeedbackPrompt } from '../feedbackPrompt';
import { extractJson, FALLBACK_FEEDBACK, parseFeedback } from '../parseFeedback';
import { buildTutorSystemPrompt, TUTOR_SAFETY_RULES } from '../tutorPrompt';
import type { RubricCriterion } from '../../types';

const rubric: RubricCriterion[] = [
  { name: '줄거리 이해', levels: ['a', 'b', 'c'] },
  { name: '나의 생각', levels: ['a', 'b', 'c'] },
];

describe('parseFeedback', () => {
  it('정상 JSON 을 그대로 읽는다', () => {
    const raw = JSON.stringify({
      praise: '좋아요',
      improvements: ['하나', '둘', '셋', '넷'],
      rubric: [{ criterion: '줄거리 이해', level: 3, comment: '인과' }, { criterion: '나의 생각', level: 2, comment: '이유' }],
      question: '왜?',
    });
    const fb = parseFeedback(raw, rubric);
    expect(fb.praise).toBe('좋아요');
    expect(fb.improvements).toEqual(['하나', '둘', '셋']); // 최대 3개
    expect(fb.rubric).toEqual([
      { criterion: '줄거리 이해', level: 3, comment: '인과' },
      { criterion: '나의 생각', level: 2, comment: '이유' },
    ]);
    expect(fb.question).toBe('왜?');
  });

  it('코드블록과 잡담이 섞여도 JSON 만 꺼낸다', () => {
    const fb = parseFeedback('여기요!\n```json\n{"praise":"멋져요"}\n```', rubric);
    expect(fb.praise).toBe('멋져요');
  });

  it('잘못된 JSON 이면 기본 문구로 대체한다', () => {
    const fb = parseFeedback('{이건 JSON 이 아님', rubric);
    expect(fb.praise).toBe(FALLBACK_FEEDBACK.praise);
    expect(fb.improvements).toEqual([FALLBACK_FEEDBACK.improvement]);
    expect(fb.question).toBe(FALLBACK_FEEDBACK.question);
    expect(fb.rubric.map((r) => r.level)).toEqual([1, 1]);
    expect(fb.rubric[0].comment).toBe(FALLBACK_FEEDBACK.rubricComment);
    expect(extractJson('없음')).toBeNull();
  });

  it('필드 누락·이상한 값도 안전하게 고친다', () => {
    const fb = parseFeedback({ praise: '  ', improvements: 'x', rubric: [{ criterion: '모르는 기준', level: '9' }, 'x'] }, rubric);
    expect(fb.praise).toBe(FALLBACK_FEEDBACK.praise);
    expect(fb.improvements).toEqual([FALLBACK_FEEDBACK.improvement]);
    expect(fb.rubric[0]).toEqual({ criterion: '줄거리 이해', level: 3, comment: FALLBACK_FEEDBACK.rubricComment }); // 같은 순서 항목 사용, 단계는 1~3로 자름
    expect(fb.rubric[1].level).toBe(1);
  });

  it('루브릭 없이도, 배열·null 입력도 처리한다', () => {
    expect(parseFeedback({ rubric: [{ criterion: 'A', level: 0, comment: 'c' }, { criterion: '', level: 2 }] }).rubric).toEqual([{ criterion: 'A', level: 1, comment: 'c' }]);
    expect(parseFeedback(null).praise).toBe(FALLBACK_FEEDBACK.praise);
    expect(parseFeedback({ rubric: [{ criterion: 'A', level: 'abc' }] }).rubric[0].level).toBe(1);
  });
});

describe('프롬프트 만들기', () => {
  it('피드백 프롬프트에 루브릭·말투·학생 글이 들어간다', () => {
    const p = buildFeedbackPrompt({ title: '독서록', prompt: '써 보세요', rubric, tone: 'editor', text: '학생 글' });
    expect(p.system).toContain('JSON');
    expect(p.system).toContain('편집자');
    expect(p.user).toContain('1. 줄거리 이해');
    expect(p.user).toContain('[학생 글 시작]\n학생 글\n[학생 글 끝]');
  });

  it('튜터 프롬프트에는 안전 규칙이 항상 들어간다', () => {
    const s = buildTutorSystemPrompt({ topic: '광합성', persona: '과학자', teacherInstruction: '' });
    expect(s).toContain(TUTOR_SAFETY_RULES);
    expect(s).not.toContain('[선생님 추가 지시]');
    expect(buildTutorSystemPrompt({ topic: '광합성', persona: '과학자', teacherInstruction: '3단원만' })).toContain('[선생님 추가 지시]\n3단원만');
  });
});
