// 이 화면이 하는 일: 교사 대시보드. 오늘 요약(제출률·인증률·승인 대기)과 학생별 현황, CSV 다운로드.
// 고치기 좋은 부분: 요약 카드 순서와 문구(tiles 배열)

import { AlertTriangle, BookOpenCheck, CalendarCheck, ChevronRight, ClipboardCheck, Download, LayoutDashboard, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState, PageStatus } from '../../components/Status';
import { terms } from '../../config/appConfig';
import { useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { downloadCsv } from '../../utils/csv';
import { formatKstShort, todayKst } from '../../utils/kstDate';
import { isModuleOn } from '../../utils/modules';
import { assignmentReportRows, routineReportRows } from '../../utils/reports';
import { achievementRate, isRoutineDay, percent } from '../../utils/stats';
import { isPastDue } from '../../utils/submissions';

export default function Dashboard() {
  const user = useSession((s) => s.user);
  const classRoom = useSession((s) => s.classRoom);
  const classId = user?.classId ?? '';
  const today = todayKst();

  const state = useAsync(async () => {
    const [members, assignments, submissions, routines, logs, messages] = await Promise.all([
      repo.listMembers(classId),
      repo.listAssignments(classId),
      repo.listSubmissions(classId),
      repo.listRoutines(classId),
      repo.listRoutineLogs(classId),
      repo.listTutorMessages(classId),
    ]);
    return { members, assignments, submissions, routines, logs, messages };
  }, [classId]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { members, assignments, submissions, routines, logs, messages } = state.data;

  const students = members.filter((m) => m.role === 'student' && m.approved);
  const pendingMembers = members.filter((m) => m.role === 'student' && (!m.approved || m.resetRequested)).length;
  const openAssignments = assignments.filter((a) => !isPastDue(a));
  const openSubmitted = openAssignments.reduce(
    (sum, a) => sum + submissions.filter((s) => s.assignmentId === a.id && students.some((st) => st.uid === s.uid)).length,
    0,
  );
  const submitRate = percent(openSubmitted, openAssignments.length * students.length);
  const todayRoutines = routines.filter((r) => isRoutineDay(r, today));
  const todayDone = todayRoutines.reduce((sum, r) => sum + logs.filter((l) => l.routineId === r.id && l.date === today).length, 0);
  const routineRate = percent(todayDone, todayRoutines.length * students.length);
  const waitingFeedback = submissions.filter((s) => s.status === 'waiting').length;
  const missingToday = students.filter((s) => todayRoutines.some((r) => !logs.some((l) => l.routineId === r.id && l.uid === s.uid && l.date === today)));

  const tiles = [
    { label: '진행 중 과제 제출률', value: `${submitRate}%`, icon: BookOpenCheck, to: '/teacher/assignments', show: isModuleOn(classRoom, 'assignments') },
    { label: '오늘 루틴 인증률', value: `${routineRate}%`, icon: CalendarCheck, to: '/teacher/routines', show: isModuleOn(classRoom, 'routines') },
    { label: '피드백 승인 대기', value: `${waitingFeedback}건`, icon: ClipboardCheck, to: '/teacher/assignments', show: isModuleOn(classRoom, 'assignments'), alert: waitingFeedback > 0 },
    { label: '가입·비밀번호 요청', value: `${pendingMembers}건`, icon: UserPlus, to: '/teacher/members', show: true, alert: pendingMembers > 0 },
  ].filter((t) => t.show);

  return (
    <div className="space-y-6">
      <section className="dashboard-welcome">
        <div className="relative z-10">
          <p className="mb-3 text-sm font-bold tracking-wide text-primary-600">함께 배우고, 매일 조금씩 자라는 {terms.room}</p>
      <PageHeader
        icon={LayoutDashboard}
        title={`${classRoom?.name ?? ''} 대시보드`}
        description={`${formatKstShort(new Date())} · ${terms.student} ${students.length}명 · ${terms.code} ${classRoom?.code ?? ''}`}
      />
        </div>
        <img src="/rainbow-pencil.png" alt="색연필로 그린 파스텔 무지개" className="dashboard-rainbow" />
      </section>

      <ul className="dashboard-tiles grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link to={t.to} className="summary-tile block h-full rounded-2xl border border-white p-5 shadow-card hover:ring-2 hover:ring-primary-200">
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.alert ? 'bg-accent-400 text-primary-950' : 'bg-primary-50 text-primary-700'}`}>
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <p className="mt-3 text-[30px] font-extrabold leading-none text-primary-950">{t.value}</p>
              <p className="mt-1.5 text-[15px] font-semibold text-muted">{t.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        {isModuleOn(classRoom, 'routines') && (
          <Card title={`오늘 아직 인증 안 한 ${terms.student}`} icon={AlertTriangle} action={<span className="chip bg-accent-100 text-accent-800">{missingToday.length}명</span>}>
            {todayRoutines.length === 0 ? (
              <EmptyState title="오늘은 루틴이 없는 날이에요" />
            ) : missingToday.length === 0 ? (
              <EmptyState title="모두 인증했어요! 🎉" />
            ) : (
              <ul className="flex flex-wrap gap-2">
                {missingToday.map((s) => (
                  <li key={s.uid}>
                    <Link to={`/teacher/members/${s.uid}`} className="chip min-h-touch bg-surface px-4 text-[16px] text-primary-900 hover:bg-primary-50">
                      {s.studentNo}. {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {isModuleOn(classRoom, 'assignments') && (
          <Card title="과제별 제출 현황" icon={BookOpenCheck}>
            {assignments.length === 0 ? (
              <EmptyState title="아직 과제가 없어요" />
            ) : (
              <ul className="space-y-4">
                {assignments.map((a) => {
                  const count = submissions.filter((s) => s.assignmentId === a.id).length;
                  return (
                    <li key={a.id}>
                      <Link to={`/teacher/assignments/${a.id}`} className="block rounded-xl p-1 hover:bg-surface">
                        <ProgressBar value={percent(count, students.length)} label={`${a.title} (${count}/${students.length})`} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      <Card
        title={`${terms.student}별 현황`}
        action={
          <div className="flex flex-wrap gap-2">
            <BigButton small variant="outline" icon={Download} onClick={() => downloadCsv(`과제현황_${today}.csv`, assignmentReportRows(students, assignments, submissions))}>
              과제 CSV
            </BigButton>
            <BigButton small variant="outline" icon={Download} onClick={() => downloadCsv(`루틴현황_${today}.csv`, routineReportRows(students, routines, logs, today))}>
              루틴 CSV
            </BigButton>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead className="text-[15px] text-muted">
              <tr className="border-b border-primary-100">
                <th className="py-2 pr-3 font-semibold">이름</th>
                <th className="py-2 pr-3 font-semibold">과제 제출</th>
                <th className="py-2 pr-3 font-semibold">루틴 평균 달성률</th>
                <th className="py-2 pr-3 font-semibold">튜터 질문</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const subCount = submissions.filter((x) => x.uid === s.uid).length;
                const rates = routines.map((r) => achievementRate(r, logs.filter((l) => l.routineId === r.id && l.uid === s.uid).map((l) => l.date), today));
                const avg = rates.length ? Math.round(rates.reduce((x, y) => x + y, 0) / rates.length) : 0;
                const questions = messages.filter((m) => m.uid === s.uid && m.role === 'student').length;
                return (
                  <tr key={s.uid} className="border-b border-primary-50">
                    <td className="py-2 pr-3 font-bold">
                      {s.studentNo}. {s.name}
                    </td>
                    <td className="py-2 pr-3">
                      {subCount}/{assignments.length}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={avg < 50 ? 'font-bold text-danger' : ''}>{avg}%</span>
                    </td>
                    <td className="py-2 pr-3">{questions}개</td>
                    <td className="py-2 text-right">
                      <Link to={`/teacher/members/${s.uid}`} className="inline-flex min-h-touch items-center gap-1 font-bold text-primary-700">
                        자세히 <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
