// 교사용 CSV 표 만들기 (과제 제출 현황 / 루틴 현황)

import type { Assignment, KstDate, Member, Routine, RoutineLog, Submission } from '../types';
import { terms } from '../config/appConfig';
import { datesBetween, formatKstDateTime } from './kstDate';
import { achievementRate, isRoutineDay } from './stats';
import { latestVersion } from './submissions';

export function assignmentReportRows(students: Member[], assignments: Assignment[], submissions: Submission[]): (string | number)[][] {
  const rows: (string | number)[][] = [['번호', '이름', '과제', '상태', '제출 횟수', '마지막 제출', '루브릭 단계(마지막 글)', `${terms.teacher} 코멘트`]];
  for (const a of assignments) {
    for (const s of students) {
      const sub = submissions.find((x) => x.assignmentId === a.id && x.uid === s.uid);
      if (!sub) {
        rows.push([s.studentNo, s.name, a.title, '미제출', 0, '', '', '']);
        continue;
      }
      const last = latestVersion(sub);
      rows.push([
        s.studentNo,
        s.name,
        a.title,
        sub.status === 'waiting' ? '확인 대기' : '공개됨',
        sub.versions.length,
        formatKstDateTime(last.createdAt),
        last.ai ? last.ai.rubric.map((r) => `${r.criterion} ${r.level}단계`).join(' / ') : '',
        last.teacherComment,
      ]);
    }
  }
  return rows;
}

export function routineReportRows(students: Member[], routines: Routine[], logs: RoutineLog[], today: KstDate): (string | number)[][] {
  if (routines.length === 0) return [['번호', '이름', '루틴', '달성률(%)']];
  const first = routines.reduce((min, r) => (r.startDate < min ? r.startDate : min), routines[0].startDate);
  const dates = first <= today ? datesBetween(first, today) : [];
  const rows: (string | number)[][] = [['번호', '이름', '루틴', '달성률(%)', ...dates]];
  for (const r of routines) {
    for (const s of students) {
      const mine = new Set(logs.filter((l) => l.routineId === r.id && l.uid === s.uid).map((l) => l.date));
      rows.push([
        s.studentNo,
        s.name,
        r.title,
        achievementRate(r, [...mine], today),
        ...dates.map((d) => (mine.has(d) ? 'O' : isRoutineDay(r, d) ? 'X' : '-')),
      ]);
    }
  }
  return rows;
}
