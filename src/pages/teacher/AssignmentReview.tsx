// 이 화면이 하는 일: 과제 하나의 학생별 제출물을 보고, AI 피드백을 고치거나 승인하고, 교사 코멘트를 남깁니다.
// 고치기 좋은 부분: 코멘트 예시 문구(COMMENT_EXAMPLES)

import { CheckCircle2, ClipboardCheck, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, ErrorState, InlineError, PageStatus } from '../../components/Status';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { terms } from '../../config/appConfig';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { AiFeedback, Assignment, Member, Submission } from '../../types';
import { formatKstDateTime } from '../../utils/kstDate';

const COMMENT_EXAMPLES = ['고쳐 쓴 부분이 훨씬 좋아졌어요!', '근거를 하나 더 찾아볼까요?', '내 경험과 연결한 점이 멋져요.'];

function ReviewPanel({ assignment, student, submission, onSaved }: { assignment: Assignment; student: Member; submission: Submission; onSaved: (s: Submission) => void }) {
  const [index, setIndex] = useState(submission.versions.length - 1);
  const version = submission.versions[index];
  const [ai, setAi] = useState<AiFeedback | null>(version.ai);
  const [comment, setComment] = useState(version.teacherComment);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const v = submission.versions[index];
    setAi(v.ai);
    setComment(v.teacherComment);
    setSaved(false);
  }, [index, submission]);

  async function save(release: boolean) {
    setBusy(true);
    setError(null);
    try {
      const versions = submission.versions.map((v, i) => (i === index ? { ...v, ai, teacherComment: comment.trim(), released: release || v.released } : v));
      const last = versions[versions.length - 1];
      const next: Submission = {
        ...submission,
        versions,
        status: last.released ? 'released' : 'waiting',
        studentUnread: last.released,
        updatedAt: new Date().toISOString(),
      };
      await repo.saveSubmission(next);
      onSaved(next);
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={`${student.studentNo}. ${student.name}의 글`}>
      <div className="space-y-5">
        {submission.versions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {submission.versions.map((v, i) => (
              <button key={v.createdAt} type="button" onClick={() => setIndex(i)} aria-pressed={i === index} className={`min-h-touch rounded-xl px-4 font-bold ${i === index ? 'bg-primary-900 text-white' : 'bg-surface text-primary-800'}`}>
                {i === 0 ? '처음 글' : `고쳐 쓰기 ${i}`}
              </button>
            ))}
          </div>
        )}
        <div className="rounded-xl bg-surface p-4">
          <p className="mb-1 text-[15px] font-semibold text-muted">{formatKstDateTime(version.createdAt)} 제출</p>
          <p className="whitespace-pre-wrap">{version.text}</p>
        </div>

        {ai ? (
          <div className="space-y-4">
            <p className="chip bg-primary-50 text-primary-700">AI가 작성한 피드백 · 고쳐서 저장할 수 있어요</p>
            <label className="block">
              <span className="label">잘한 점</span>
              <textarea className="input min-h-[80px]" value={ai.praise} onChange={(e) => setAi({ ...ai, praise: e.target.value })} />
            </label>
            <div>
              <span className="label">개선 제안</span>
              <div className="space-y-2">
                {ai.improvements.map((item, i) => (
                  <input
                    key={i}
                    className="input"
                    aria-label={`개선 제안 ${i + 1}`}
                    value={item}
                    onChange={(e) => setAi({ ...ai, improvements: ai.improvements.map((x, j) => (j === i ? e.target.value : x)) })}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="label">루브릭 단계</span>
              <div className="space-y-3">
                {ai.rubric.map((r, i) => {
                  const criterion = assignment.rubric.find((c) => c.name === r.criterion);
                  return (
                    <div key={r.criterion} className="rounded-xl border border-primary-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold">{r.criterion}</span>
                        <div className="flex gap-1" role="radiogroup" aria-label={`${r.criterion} 단계`}>
                          {[1, 2, 3].map((lv) => (
                            <button
                              key={lv}
                              type="button"
                              role="radio"
                              aria-checked={r.level === lv}
                              title={criterion?.levels[lv - 1]}
                              onClick={() => setAi({ ...ai, rubric: ai.rubric.map((x, j) => (j === i ? { ...x, level: lv } : x)) })}
                              className={`h-12 w-12 rounded-xl font-extrabold ${r.level === lv ? 'bg-accent-400 text-primary-950' : 'bg-surface text-primary-700'}`}
                            >
                              {lv}
                            </button>
                          ))}
                        </div>
                      </div>
                      {criterion && <p className="mt-1 text-[15px] text-muted">{r.level}단계: {criterion.levels[r.level - 1]}</p>}
                      <input
                        className="input mt-2"
                        aria-label={`${r.criterion} 근거`}
                        value={r.comment}
                        onChange={(e) => setAi({ ...ai, rubric: ai.rubric.map((x, j) => (j === i ? { ...x, comment: e.target.value } : x)) })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <label className="block">
              <span className="label">생각을 넓히는 질문</span>
              <input className="input" value={ai.question} onChange={(e) => setAi({ ...ai, question: e.target.value })} />
            </label>
          </div>
        ) : (
          <EmptyState title="AI 피드백이 없어요" />
        )}

        <label className="block">
          <span className="label">{terms.teacher} 코멘트 ({terms.student}에게 보여요)</span>
          <textarea className="input min-h-[90px]" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="따뜻한 한마디를 남겨 주세요." />
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMENT_EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setComment((c) => (c ? `${c} ${ex}` : ex))} className="chip min-h-touch bg-surface px-4 text-[15px] text-primary-800 hover:bg-primary-50">
              + {ex}
            </button>
          ))}
        </div>

        <InlineError message={error} />
        {saved && (
          <p className="flex items-center gap-2 font-bold text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden /> 저장했어요.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {!version.released && (
            <BigButton full variant="accent" icon={CheckCircle2} onClick={() => save(true)} loading={busy}>
              승인하고 {terms.student}에게 공개
            </BigButton>
          )}
          <BigButton full variant={version.released ? 'primary' : 'outline'} icon={Save} onClick={() => save(false)} loading={busy}>
            {version.released ? '수정 내용 저장' : '공개하지 않고 저장'}
          </BigButton>
        </div>
      </div>
    </Card>
  );
}

export default function AssignmentReview() {
  const { id = '' } = useParams();
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const state = useAsync(async () => {
    const [assignment, subs, members] = await Promise.all([repo.getAssignment(classId, id), repo.listSubmissions(classId, { assignmentId: id }), repo.listMembers(classId)]);
    return { assignment, subs, students: members.filter((m) => m.role === 'student' && m.approved) };
  }, [classId, id]);

  useEffect(() => {
    if (!state.data) return;
    setSubmissions(state.data.subs);
    const firstWaiting = state.data.subs.find((s) => s.status === 'waiting') ?? state.data.subs[0];
    setSelectedUid((prev) => prev ?? firstWaiting?.uid ?? null);
  }, [state.data]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { assignment, students } = state.data;
  if (!assignment) return <ErrorState message="과제를 찾을 수 없어요." />;

  const selectedStudent = students.find((s) => s.uid === selectedUid);
  const selectedSub = submissions.find((s) => s.uid === selectedUid);

  return (
    <div className="space-y-5">
      <PageHeader backTo="/teacher/assignments" icon={ClipboardCheck} title={assignment.title} description={`제출 ${submissions.length}/${students.length}명 · ${assignment.feedbackRelease === 'instant' ? '즉시 공개' : `${terms.teacher} 확인 후 공개`}`} />
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <ul className="space-y-1.5 rounded-2xl bg-white p-3 shadow-card lg:max-h-[75vh] lg:overflow-y-auto" aria-label={`${terms.student} 목록`}>
          {students.map((s) => {
            const sub = submissions.find((x) => x.uid === s.uid);
            const chip = !sub ? ['미제출', 'text-muted'] : sub.status === 'waiting' ? ['승인 대기', 'text-accent-700'] : [`공개 · ${sub.versions.length}회`, 'text-success'];
            return (
              <li key={s.uid}>
                <button
                  type="button"
                  disabled={!sub}
                  onClick={() => setSelectedUid(s.uid)}
                  className={`flex min-h-touch w-full items-center justify-between rounded-xl px-3 text-left ${selectedUid === s.uid ? 'bg-primary-900 text-white' : 'hover:bg-surface disabled:opacity-60'}`}
                >
                  <span className="font-semibold">
                    {s.studentNo}. {s.name}
                  </span>
                  <span className={`text-[14px] font-bold ${selectedUid === s.uid ? 'text-accent-200' : chip[1]}`}>
                    {chip[0]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {selectedStudent && selectedSub ? (
          <ReviewPanel
            key={selectedSub.id}
            assignment={assignment}
            student={selectedStudent}
            submission={selectedSub}
            onSaved={(next) => setSubmissions((prev) => prev.map((s) => (s.id === next.id ? next : s)))}
          />
        ) : (
          <EmptyState title={`왼쪽에서 ${terms.student}을 골라 주세요`} />
        )}
      </div>
    </div>
  );
}
