// 이 화면이 하는 일: 내 과제 글 + 피드백 + 고쳐 쓰기 이력을 시간순으로 모아 보여 주고, 인쇄(학기 말 상담 자료)할 수 있어요.
// 고치기 좋은 부분: 인쇄 머리글 문구, 루틴 요약 표시 여부

import { FolderHeart, Printer } from 'lucide-react';
import { BigButton } from '../../components/BigButton';
import { FeedbackCard } from '../../components/FeedbackCard';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, PageStatus } from '../../components/Status';
import { appConfig } from '../../config/appConfig';
import { useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { formatKstDateTime, formatKstShort, todayKst } from '../../utils/kstDate';
import { achievementRate } from '../../utils/stats';

export default function Portfolio() {
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
  const timeline = [...submissions].sort((a, b) => a.versions[0].createdAt.localeCompare(b.versions[0].createdAt));

  return (
    <div>
      <PageHeader
        icon={FolderHeart}
        title="나의 포트폴리오"
        description="내가 쓰고, 피드백 받고, 고쳐 쓴 성장의 기록"
        action={
          <BigButton variant="outline" icon={Printer} onClick={() => window.print()} className="no-print">
            인쇄하기
          </BigButton>
        }
      />

      {/* 인쇄할 때만 보이는 머리글 */}
      <div className="mb-6 hidden border-b-2 border-primary-900 pb-3 print:block">
        <p className="text-sm">{appConfig.organization} · {classRoom?.name}</p>
        <p className="text-2xl font-extrabold">{user?.name} 학습 포트폴리오</p>
        <p className="text-sm">출력일 {formatKstShort(new Date())}</p>
      </div>

      {routines.length > 0 && (
        <section className="print-break mb-6 rounded-2xl bg-white p-5 shadow-card">
          <h2 className="mb-3 font-bold text-primary-900">루틴 달성률</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {routines.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3">
                <span className="font-semibold">{r.title}</span>
                <span className="font-extrabold text-primary-900">
                  {achievementRate(r, logs.filter((l) => l.routineId === r.id).map((l) => l.date), today)}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {timeline.length === 0 ? (
        <EmptyState title="아직 낸 과제가 없어요" />
      ) : (
        <ol className="relative space-y-10 border-l-4 border-accent-200 pl-5 sm:pl-8">
          {timeline.map((sub) => {
            const a = assignments.find((x) => x.id === sub.assignmentId);
            return (
              <li key={sub.id} className="relative">
                <span className="absolute -left-[34px] top-1 h-5 w-5 rounded-full border-4 border-white bg-accent-400 sm:-left-[46px]" aria-hidden />
                <h2 className="text-xl font-extrabold text-primary-950">{a?.title ?? '삭제된 과제'}</h2>
                <div className="mt-3 space-y-4">
                  {sub.versions.map((v, i) => (
                    <div key={v.createdAt} className="space-y-3">
                      <div className="print-break rounded-2xl bg-white p-5 shadow-card">
                        <p className="mb-2 flex items-center justify-between text-[15px] font-bold text-primary-700">
                          <span>{i === 0 ? '처음 쓴 글' : `고쳐 쓰기 ${i}`}</span>
                          <span className="font-semibold text-muted">{formatKstDateTime(v.createdAt)}</span>
                        </p>
                        <p className="whitespace-pre-wrap">{v.text}</p>
                      </div>
                      {v.released && v.ai && <FeedbackCard feedback={v.ai} teacherComment={v.teacherComment} />}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
