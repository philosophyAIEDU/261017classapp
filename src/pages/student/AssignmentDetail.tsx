// 이 화면이 하는 일: 과제 안내를 보고 글을 내면 AI 피드백 카드가 나옵니다. 피드백을 보고 최대 2번 고쳐 쓸 수 있어요.
// 고치기 좋은 부분: 로딩 문구(AI_LOADING), 고쳐 쓰기 횟수는 appConfig.assignments.maxRevisions

import { Bot, History, PenLine, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { FeedbackCard } from '../../components/FeedbackCard';
import { PageHeader } from '../../components/PageHeader';
import { RubricTable } from '../../components/RubricTable';
import { ErrorState, InlineError, PageStatus, PrivacyNotice } from '../../components/Status';
import { appConfig, terms } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { aiClient } from '../../services/aiClient';
import { useSession } from '../../store/sessionStore';
import type { Submission, SubmissionVersion } from '../../types';
import { createId } from '../../utils/id';
import { withJosa } from '../../utils/josa';
import { formatKstDateTime } from '../../utils/kstDate';
import { countChars, isPastDue, latestVersion, revisionsLeft } from '../../utils/submissions';

const AI_LOADING = `${withJosa(terms.aiName, '이', '가')} 글을 읽고 있어요…`;

export default function AssignmentDetail() {
  const { id = '' } = useParams();
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const uid = user?.uid ?? '';

  const state = useAsync(async () => {
    const [assignment, subs] = await Promise.all([repo.getAssignment(classId, id), repo.listSubmissions(classId, { uid, assignmentId: id })]);
    return { assignment, submission: subs[0] as Submission | undefined };
  }, [classId, uid, id]);

  const [submission, setSubmission] = useState<Submission | undefined>(undefined);
  const [selected, setSelected] = useState(0);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'ai'>('idle');
  const [error, setError] = useState<string | null>(null);

  // 불러온 제출물을 화면 상태로 옮기고, 새 피드백이면 "읽음"으로 표시
  useEffect(() => {
    const sub = state.data?.submission;
    setSubmission(sub);
    setSelected(sub ? sub.versions.length - 1 : 0);
    setEditing(!sub);
    if (sub?.studentUnread && sub.status === 'released') {
      repo.saveSubmission({ ...sub, studentUnread: false }).catch(() => undefined);
    }
  }, [state.data]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { assignment } = state.data;
  if (!assignment) return <ErrorState message="과제를 찾을 수 없어요." />;

  const chars = countChars(text);
  const maxChars = Math.min(assignment.maxChars, appConfig.ai.maxInputChars);
  const tooShort = chars < assignment.minChars;
  const tooLong = chars > maxChars;
  const left = revisionsLeft(submission);
  const latest = submission ? latestVersion(submission) : null;
  const canRevise = !!latest && latest.released && left > 0;

  async function handleSubmit() {
    if (!assignment || tooShort || tooLong) return;
    setError(null);
    setPhase('ai');
    try {
      const ai = await aiClient.getFeedback({ assignment, text });
      const version: SubmissionVersion = {
        text,
        ai,
        released: assignment.feedbackRelease === 'instant',
        teacherComment: '',
        createdAt: new Date().toISOString(),
      };
      const next: Submission = {
        id: submission?.id ?? createId('sub-'),
        classId,
        assignmentId: assignment.id,
        uid,
        versions: [...(submission?.versions ?? []), version],
        status: version.released ? 'released' : 'waiting',
        studentUnread: false,
        updatedAt: version.createdAt,
      };
      await repo.saveSubmission(next);
      setSubmission(next);
      setSelected(next.versions.length - 1);
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPhase('idle');
    }
  }

  function startRevision() {
    if (latest) setText(latest.text);
    setEditing(true);
    setError(null);
  }

  const shown = submission?.versions[selected];

  return (
    <div className="space-y-5">
      <PageHeader backTo="/assignments" title={assignment.title} description={`마감 ${formatKstDateTime(assignment.dueAt)}${isPastDue(assignment) ? ' (마감 지남)' : ''}`} />

      <Card title="과제 안내">
        <p className="whitespace-pre-wrap">{assignment.prompt}</p>
        <p className="mt-3 text-[15px] font-semibold text-primary-700">
          글자 수 {assignment.minChars}~{maxChars}자 · 고쳐 쓰기 최대 {appConfig.assignments.maxRevisions}번
        </p>
        <details className="mt-4">
          <summary className="min-h-touch cursor-pointer py-3 font-bold text-primary-800">평가 기준(루브릭) 보기</summary>
          <RubricTable rubric={assignment.rubric} results={shown?.released ? shown.ai?.rubric : undefined} />
        </details>
      </Card>

      {submission && submission.versions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="버전 기록">
          <History className="h-5 w-5 text-primary-600" aria-hidden />
          {submission.versions.map((v, i) => (
            <button
              key={v.createdAt}
              type="button"
              role="tab"
              aria-selected={selected === i}
              onClick={() => setSelected(i)}
              className={`min-h-touch rounded-xl px-4 font-bold ${selected === i ? 'bg-primary-900 text-white' : 'bg-white text-primary-800 shadow-card'}`}
            >
              {i === 0 ? '처음 쓴 글' : `고쳐 쓰기 ${i}`}
            </button>
          ))}
        </div>
      )}

      {shown && !editing && phase === 'idle' && (
        <>
          <Card title={selected === 0 ? '내가 쓴 글' : `고쳐 쓴 글 ${selected}`} action={<span className="text-[15px] text-muted">{formatKstDateTime(shown.createdAt)}</span>}>
            <p className="whitespace-pre-wrap leading-relaxed">{shown.text}</p>
          </Card>
          {shown.released && shown.ai ? (
            <FeedbackCard feedback={shown.ai} teacherComment={shown.teacherComment} />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-primary-50 px-5 py-5 font-semibold text-primary-900">
              <Bot className="h-6 w-6 shrink-0 text-primary-600" aria-hidden />
              {terms.teacher}이 AI 피드백을 확인하고 있어요. 조금만 기다려 주세요!
            </div>
          )}
          {selected === submission!.versions.length - 1 && (
            <div className="no-print">
              {canRevise ? (
                <BigButton full variant="accent" icon={PenLine} onClick={startRevision}>
                  피드백 보고 고쳐 쓰기 (남은 횟수 {left}번)
                </BigButton>
              ) : left === 0 ? (
                <p className="text-center font-semibold text-muted">고쳐 쓰기를 모두 마쳤어요. 정말 수고했어요!</p>
              ) : null}
            </div>
          )}
        </>
      )}

      {phase === 'ai' && (
        <div role="status" className="flex flex-col items-center gap-4 rounded-2xl bg-white px-6 py-12 text-center shadow-card">
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent-300/60" />
            <span className="relative grid h-16 w-16 place-items-center rounded-full bg-primary-900 text-accent-300">
              <Bot className="h-8 w-8" aria-hidden />
            </span>
          </div>
          <p className="text-lg font-bold text-primary-900">{AI_LOADING}</p>
          <p className="text-muted">루브릭 기준 하나하나를 꼼꼼히 살펴보는 중이에요.</p>
        </div>
      )}

      {editing && phase === 'idle' && (
        <Card title={submission ? '고쳐 쓰기' : '글 쓰기'} icon={PenLine}>
          <div className="space-y-3">
            <PrivacyNotice />
            <label className="sr-only" htmlFor="essay">
              내 글
            </label>
            <textarea
              id="essay"
              className="input min-h-[280px] leading-relaxed"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 글을 써 보세요."
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
              <span className={`font-bold ${tooShort || tooLong ? 'text-danger' : 'text-success'}`}>
                {chars}자 / {assignment.minChars}~{maxChars}자
              </span>
              {tooShort && <span className="text-muted">{assignment.minChars - chars}자 더 써 볼까요?</span>}
              {tooLong && <span className="text-danger">{chars - maxChars}자를 줄여 주세요.</span>}
            </div>
            <InlineError message={error} />
            <div className="flex gap-2">
              {submission && (
                <BigButton variant="outline" onClick={() => setEditing(false)}>
                  취소
                </BigButton>
              )}
              <BigButton full icon={Send} onClick={handleSubmit} disabled={tooShort || tooLong}>
                제출하고 AI 피드백 받기
              </BigButton>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
