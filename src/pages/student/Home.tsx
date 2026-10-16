// 이 화면이 하는 일: 학생 홈. 오늘 할 일(안 낸 과제, 오늘 루틴), 새 피드백 알림, 내 불꽃 배지를 보여 줍니다.
// 고치기 좋은 부분: 인사말(greeting), 카드 순서

import { Bell, BookOpenCheck, CalendarCheck, CheckCircle2, ChevronRight, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Card';
import { EmptyState, PageStatus } from '../../components/Status';
import { StreakBadge } from '../../components/StreakBadge';
import { terms } from '../../config/appConfig';
import { useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { formatKstDateTime, formatKstShort, todayKst } from '../../utils/kstDate';
import { isModuleOn } from '../../utils/modules';
import { currentStreak, isRoutineDay } from '../../utils/stats';
import { isPastDue } from '../../utils/submissions';

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Seoul' }).format(new Date()));
  if (hour < 12) return '좋은 아침이에요';
  if (hour < 18) return '오늘도 힘내요';
  return '오늘 하루도 수고했어요';
}

export default function Home() {
  const user = useSession((s) => s.user);
  const classRoom = useSession((s) => s.classRoom);
  const classId = user?.classId ?? '';
  const uid = user?.uid ?? '';
  const today = todayKst();

  const state = useAsync(async () => {
    const [assignments, submissions, routines, logs] = await Promise.all([
      repo.listAssignments(classId),
      repo.listSubmissions(classId, { uid }),
      repo.listRoutines(classId),
      repo.listRoutineLogs(classId, { uid }),
    ]);
    return { assignments, submissions, routines, logs };
  }, [classId, uid]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { assignments, submissions, routines, logs } = state.data;

  const showAssignments = isModuleOn(classRoom, 'assignments');
  const showRoutines = isModuleOn(classRoom, 'routines');

  const todoAssignments = assignments.filter((a) => !submissions.some((s) => s.assignmentId === a.id) && !isPastDue(a));
  const todayRoutines = routines.filter((r) => isRoutineDay(r, today));
  const newFeedback = submissions.filter((s) => s.studentUnread && s.status === 'released');
  const loggedDates = [...new Set(logs.map((l) => l.date))];
  const streak = currentStreak(loggedDates, today, (d) => routines.some((r) => isRoutineDay(r, d)));
  const doneToday = todayRoutines.filter((r) => logs.some((l) => l.routineId === r.id && l.date === today)).length;

  return (
    <div className="space-y-5">
      <div>
        <p className="font-semibold text-accent-700">{formatKstShort(new Date())}</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-tight text-primary-950">
          {user?.name}님, {greeting()}!
        </h1>
      </div>

      {newFeedback.length > 0 && (
        <Link
          to={`/assignments/${newFeedback[0].assignmentId}`}
          className="flex min-h-touch items-center gap-3 rounded-2xl bg-accent-400 px-5 py-4 font-bold text-primary-950 shadow-card"
        >
          <Bell className="h-6 w-6 shrink-0" aria-hidden />
          <span className="flex-1">새 피드백이 {newFeedback.length}개 도착했어요!</span>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {showRoutines && (
            <Card title="오늘의 루틴" icon={CalendarCheck} action={<span className="chip bg-primary-50 text-primary-800">{doneToday}/{todayRoutines.length} 완료</span>}>
              {todayRoutines.length === 0 ? (
                <EmptyState title="오늘은 쉬는 날이에요" />
              ) : (
                <ul className="space-y-2">
                  {todayRoutines.map((r) => {
                    const done = logs.some((l) => l.routineId === r.id && l.date === today);
                    return (
                      <li key={r.id}>
                        <Link
                          to={`/routines?id=${r.id}`}
                          className={`flex min-h-[60px] items-center gap-3 rounded-xl border px-4 py-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-primary-100 hover:border-primary-300'}`}
                        >
                          {done ? <CheckCircle2 className="h-6 w-6 text-success" aria-hidden /> : <Circle className="h-6 w-6 text-primary-300" aria-hidden />}
                          <span className="flex-1 font-semibold">{r.title}</span>
                          <span className={`text-[15px] font-bold ${done ? 'text-success' : 'text-accent-700'}`}>{done ? '인증 완료' : '인증하기'}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {showAssignments && (
            <Card title="아직 안 낸 과제" icon={BookOpenCheck}>
              {todoAssignments.length === 0 ? (
                <EmptyState title="모든 과제를 냈어요. 멋져요! 🎉" />
              ) : (
                <ul className="space-y-2">
                  {todoAssignments.map((a) => (
                    <li key={a.id}>
                      <Link to={`/assignments/${a.id}`} className="flex min-h-[60px] items-center gap-3 rounded-xl border border-primary-100 px-4 py-3 hover:border-primary-300">
                        <span className="flex-1">
                          <span className="block font-semibold">{a.title}</span>
                          <span className="text-[15px] text-muted">마감 {formatKstDateTime(a.dueAt)}</span>
                        </span>
                        <ChevronRight className="h-5 w-5 text-primary-400" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {showRoutines && (
          <aside className="space-y-3">
            <StreakBadge streak={streak} />
            <p className="px-1 text-[15px] text-muted">하루에 루틴을 하나라도 인증하면 불꽃이 이어져요. {terms.teacher}도 응원하고 있어요!</p>
          </aside>
        )}
      </div>
    </div>
  );
}
