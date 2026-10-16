import { toCsv } from '../csv';
import { generateClassCode, generateTempPassword, studentEmail } from '../id';
import { hasBatchim, withJosa } from '../josa';
import { normalizeWord, topKeywords } from '../keywords';
import { assignmentReportRows, routineReportRows } from '../reports';
import { countChars, isPastDue, revisionsLeft, studentStatus } from '../submissions';
import type { Assignment, Member, Submission } from '../../types';

const student: Member = { uid: 'u1', classId: 'c', role: 'student', studentNo: '1', name: '하늘', approved: true, joinedAt: '' };
const assignment: Assignment = {
  id: 'a1', classId: 'c', title: '독서록', prompt: '', dueAt: '2026-10-20T14:59:59Z', minChars: 10, maxChars: 100,
  rubric: [{ name: '이해', levels: ['1', '2', '3'] }], feedbackRelease: 'instant', tone: 'coach', createdAt: '',
};
const submission: Submission = {
  id: 's1', classId: 'c', assignmentId: 'a1', uid: 'u1', status: 'released', studentUnread: true, updatedAt: '',
  versions: [{ text: '글', ai: { praise: '', improvements: [], rubric: [{ criterion: '이해', level: 2, comment: '' }], question: '' }, released: true, teacherComment: '굿', createdAt: '2026-10-16T01:00:00Z' }],
};

describe('작은 도우미들', () => {
  it('학급 코드와 합성 이메일', () => {
    expect(generateClassCode(() => 0)).toBe('AAAAAA');
    expect(generateClassCode()).toMatch(/^[A-Z2-9]{6}$/);
    expect(studentEmail(' demo26 ', '7')).toBe('demo26-7@classapp.local');
    expect(generateTempPassword(() => 0.5)).toBe('555555');
  });

  it('CSV 는 쉼표·따옴표를 감싼다', () => {
    expect(toCsv([['a', 'b,c'], ['"x"', 1]])).toBe('a,"b,c"\r\n"""x""",1');
  });

  it('조사 고르기', () => {
    expect(hasBatchim('선생님')).toBe(true);
    expect(withJosa('AI 코치', '이', '가')).toBe('AI 코치가');
    expect(hasBatchim('AI')).toBe(false);
  });

  it('질문 키워드', () => {
    expect(normalizeWord('광합성은')).toBe('광합성');
    const top = topKeywords(['광합성 식 알려줘', '광합성은 왜 해?', '엽록체가 뭐야']);
    expect(top[0]).toEqual({ word: '광합성', count: 2 });
  });

  it('제출 상태 계산', () => {
    expect(revisionsLeft(undefined)).toBe(2);
    expect(revisionsLeft(submission)).toBe(2);
    expect(studentStatus(undefined).tone).toBe('todo');
    expect(studentStatus(submission).label).toBe('새 피드백');
    expect(studentStatus({ ...submission, status: 'waiting' }).tone).toBe('waiting');
    expect(isPastDue(assignment, new Date('2026-10-21T00:00:00Z'))).toBe(true);
    expect(countChars('  안녕  ')).toBe(2);
  });

  it('CSV 보고서 행', () => {
    const rows = assignmentReportRows([student, { ...student, uid: 'u2', name: '도윤', studentNo: '2' }], [assignment], [submission]);
    expect(rows[1]).toContain('공개됨');
    expect(rows[1]).toContain('이해 2단계');
    expect(rows[2]).toContain('미제출');
    const r = routineReportRows([student], [{ id: 'r', classId: 'c', title: '독서', description: '', days: [], startDate: '2026-10-15', endDate: '2026-10-31', createdAt: '' }],
      [{ id: 'l', classId: 'c', routineId: 'r', uid: 'u1', date: '2026-10-15', text: '', imageUrls: [], createdAt: '', updatedAt: '' }], '2026-10-16');
    expect(r[0]).toEqual(['번호', '이름', '루틴', '달성률(%)', '2026-10-15', '2026-10-16']);
    expect(r[1]).toEqual(['1', '하늘', '독서', 50, 'O', 'X']);
    expect(routineReportRows([student], [], [], '2026-10-16')).toHaveLength(1);
  });
});
