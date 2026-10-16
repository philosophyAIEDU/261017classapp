// 이 화면이 하는 일: 우리 반 과제 목록과 내 제출 상태(제출 전 / 확인 중 / 피드백 완료)를 보여 줍니다.
// 고치기 좋은 부분: 정렬 순서, 상태 이름(utils/submissions.ts)

import { BookOpenCheck, ChevronRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, PageStatus } from '../../components/Status';
import { useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { formatKstDateTime } from '../../utils/kstDate';
import { isPastDue, statusChipClass, studentStatus } from '../../utils/submissions';

export default function Assignments() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const uid = user?.uid ?? '';

  const state = useAsync(async () => {
    const [assignments, submissions] = await Promise.all([repo.listAssignments(classId), repo.listSubmissions(classId, { uid })]);
    return { assignments, submissions };
  }, [classId, uid]);

  return (
    <div>
      <PageHeader icon={BookOpenCheck} title="AI 첨삭 과제방" description="글을 내면 AI가 루브릭에 맞춰 바로 피드백해 줘요." />
      {!state.data ? (
        <PageStatus {...state} onRetry={state.reload} />
      ) : state.data.assignments.length === 0 ? (
        <EmptyState title="아직 과제가 없어요" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {state.data.assignments.map((a) => {
            const sub = state.data?.submissions.find((s) => s.assignmentId === a.id);
            const status = studentStatus(sub);
            const late = isPastDue(a);
            return (
              <li key={a.id}>
                <Link to={`/assignments/${a.id}`} className="flex h-full items-start gap-3 rounded-2xl bg-white p-5 shadow-card hover:ring-2 hover:ring-primary-200">
                  <div className="flex-1">
                    <span className={`chip ${statusChipClass[status.tone]}`}>{status.label}</span>
                    <p className="mt-2 text-lg font-bold text-primary-950">{a.title}</p>
                    <p className="mt-1 line-clamp-2 text-muted">{a.prompt}</p>
                    <p className={`mt-2 flex items-center gap-1.5 text-[15px] font-semibold ${late ? 'text-danger' : 'text-primary-700'}`}>
                      <Clock className="h-4 w-4" aria-hidden />
                      {late ? '마감 지남 · ' : '마감 '}
                      {formatKstDateTime(a.dueAt)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-5 w-5 text-primary-400" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
