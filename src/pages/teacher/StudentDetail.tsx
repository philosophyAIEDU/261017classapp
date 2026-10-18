// 이 화면이 하는 일: 학생 한 명의 제출물·AI 피드백, 루틴 기록, 튜터 질문 기록을 한 화면에서 봅니다.
// 고치기 좋은 부분: 보여 줄 최근 질문 개수(RECENT_QUESTIONS)

import { BookOpenCheck, CalendarCheck, MessageCircleQuestion, UserRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Card } from '../../components/Card';
import { FeedbackCard } from '../../components/FeedbackCard';
import { GrassCalendar } from '../../components/GrassCalendar';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState, ErrorState, PageStatus } from '../../components/Status';
import { StreakBadge } from '../../components/StreakBadge';
import { useAsync } from '../../hooks/useAsync';
import { terms } from '../../config/appConfig';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { formatKstDateTime, todayKst } from '../../utils/kstDate';
import { achievementRate, isRoutineDay, routineStreak } from '../../utils/stats';
import { latestVersion } from '../../utils/submissions';

const RECENT_QUESTIONS = 20;

export default function StudentDetail() {
  const { uid = '' } = useParams();
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const today = todayKst();

  const state = useAsync(async () => {
    const [member, assignments, submissions, routines, logs, messages, rooms] = await Promise.all([
      repo.getMember(classId, uid),
      repo.listAssignments(classId),
      repo.listSubmissions(classId, { uid }),
      repo.listRoutines(classId),
      repo.listRoutineLogs(classId, { uid }),
      repo.listTutorMessages(classId, { uid }),
      repo.listTutorRooms(classId),
    ]);
    return { member, assignments, submissions, routines, logs, messages, rooms };
  }, [classId, uid]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { member, assignments, submissions, routines, logs, messages, rooms } = state.data;
  if (!member) return <ErrorState message={`${terms.student}을 찾을 수 없어요.`} />;
  const questions = messages.filter((m) => m.role === 'student').slice(-RECENT_QUESTIONS).reverse();

  return (
    <div className="space-y-5">
      <PageHeader backTo="/teacher" icon={UserRound} title={`${member.studentNo}. ${member.name}`} description={`${formatKstDateTime(member.joinedAt)} 가입`} />

      <Card title="과제 제출물" icon={BookOpenCheck}>
        {assignments.length === 0 ? (
          <EmptyState title="과제가 없어요" />
        ) : (
          <div className="space-y-6">
            {assignments.map((a) => {
              const sub = submissions.find((s) => s.assignmentId === a.id);
              const last = sub && latestVersion(sub);
              return (
                <div key={a.id} className="space-y-3">
                  <p className="flex flex-wrap items-center gap-2 text-lg font-bold text-primary-950">
                    {a.title}
                    <span className={`chip ${!sub ? 'bg-accent-100 text-accent-800' : sub.status === 'waiting' ? 'bg-primary-50 text-primary-700' : 'bg-emerald-50 text-success'}`}>
                      {!sub ? '미제출' : sub.status === 'waiting' ? '승인 대기' : `제출 ${sub.versions.length}회`}
                    </span>
                  </p>
                  {last && (
                    <>
                      <p className="whitespace-pre-wrap rounded-xl bg-surface p-4">{last.text}</p>
                      {last.ai && <FeedbackCard feedback={last.ai} teacherComment={last.teacherComment} />}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="루틴 기록" icon={CalendarCheck}>
        {routines.length === 0 ? (
          <EmptyState title="루틴이 없어요" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {routines.map((r) => {
              const dates = logs.filter((l) => l.routineId === r.id).map((l) => l.date);
              return (
                <div key={r.id} className="space-y-3">
                  <ProgressBar value={achievementRate(r, dates, today)} label={r.title} />
                  <StreakBadge compact streak={routineStreak(r, dates, today)} />
                  <GrassCalendar today={today} loggedDates={dates} isScheduled={(d) => isRoutineDay(r, d)} weeks={4} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="튜터 질문 기록" icon={MessageCircleQuestion}>
        {questions.length === 0 ? (
          <EmptyState title="아직 질문이 없어요" />
        ) : (
          <ul className="divide-y divide-primary-100">
            {questions.map((q) => (
              <li key={q.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="chip bg-primary-50 text-primary-700">{rooms.find((r) => r.id === q.roomId)?.topic ?? '튜터'}</span>
                <span className="flex-1 font-semibold">{q.text}</span>
                <span className="text-[14px] text-muted">{formatKstDateTime(q.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
