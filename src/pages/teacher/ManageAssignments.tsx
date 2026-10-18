// 이 화면이 하는 일: 과제 만들기(안내문·마감·글자 수·루브릭·공개 방식)와 과제 목록.
// 고치기 좋은 부분: 루브릭 템플릿은 src/prompts/rubricTemplates.ts, 기본 마감일(DEFAULT_DUE_DAYS)

import { BookOpenCheck, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, InlineError, PageStatus } from '../../components/Status';
import { appConfig, terms } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { toneGuides } from '../../prompts/feedbackPrompt';
import { rubricTemplates } from '../../prompts/rubricTemplates';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { Assignment, FeedbackTone, RubricCriterion } from '../../types';
import { createId } from '../../utils/id';
import { addDaysKst, endOfKstDayIso, formatKstDateTime, todayKst, toKstDate } from '../../utils/kstDate';
import { isPastDue } from '../../utils/submissions';

const DEFAULT_DUE_DAYS = 7;
const MIN_CRITERIA = 2;
const MAX_CRITERIA = 5;

function emptyCriterion(): RubricCriterion {
  return { name: '', levels: ['', '', ''] };
}

function RubricEditor({ rubric, onChange }: { rubric: RubricCriterion[]; onChange: (r: RubricCriterion[]) => void }) {
  function update(i: number, patch: Partial<RubricCriterion>) {
    onChange(rubric.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  }
  return (
    <div className="space-y-3">
      {rubric.map((c, i) => (
        <div key={i} className="rounded-xl border border-primary-100 p-4">
          <div className="flex items-center gap-2">
            <input className="input flex-1 font-bold" placeholder={`기준 ${i + 1} 이름 (예: 줄거리 이해)`} value={c.name} onChange={(e) => update(i, { name: e.target.value })} required />
            {rubric.length > MIN_CRITERIA && (
              <button type="button" onClick={() => onChange(rubric.filter((_, j) => j !== i))} className="grid h-12 w-12 place-items-center rounded-xl text-danger hover:bg-red-50" aria-label={`기준 ${i + 1} 삭제`}>
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {c.levels.map((lv, k) => (
              <label key={k} className="block">
                <span className="text-[14px] font-semibold text-primary-700">{k + 1}단계</span>
                <input
                  className="input"
                  value={lv}
                  required
                  onChange={(e) => {
                    const levels: [string, string, string] = [...c.levels];
                    levels[k] = e.target.value;
                    update(i, { levels });
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      {rubric.length < MAX_CRITERIA && (
        <BigButton small variant="outline" icon={Plus} onClick={() => onChange([...rubric, emptyCriterion()])}>
          평가 기준 추가 ({rubric.length}/{MAX_CRITERIA})
        </BigButton>
      )}
    </div>
  );
}

function AssignmentForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const user = useSession((s) => s.user);
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [dueDate, setDueDate] = useState(addDaysKst(todayKst(), DEFAULT_DUE_DAYS));
  const [minChars, setMinChars] = useState(200);
  const [maxChars, setMaxChars] = useState(800);
  const [rubric, setRubric] = useState<RubricCriterion[]>([emptyCriterion(), emptyCriterion()]);
  const [release, setRelease] = useState<Assignment['feedbackRelease']>('instant');
  const [tone, setTone] = useState<FeedbackTone>(appConfig.ai.defaultFeedbackTone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(id: string) {
    const t = rubricTemplates.find((x) => x.id === id);
    if (!t) return;
    setTitle(t.suggestedTitle);
    setPrompt(t.suggestedPrompt);
    setMinChars(t.minChars);
    setMaxChars(t.maxChars);
    setRubric(t.rubric.map((c) => ({ name: c.name, levels: [...c.levels] })));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.classId) return;
    if (minChars >= maxChars) {
      setError('최소 글자 수는 최대 글자 수보다 작아야 해요.');
      return;
    }
    if (maxChars > appConfig.ai.maxInputChars) {
      setError(`최대 글자 수는 ${appConfig.ai.maxInputChars}자를 넘을 수 없어요.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repo.saveAssignment({
        id: createId('a-'),
        classId: user.classId,
        title: title.trim(),
        prompt: prompt.trim(),
        dueAt: endOfKstDayIso(dueDate),
        minChars,
        maxChars,
        rubric: rubric.map((c) => ({ name: c.name.trim(), levels: c.levels.map((l) => l.trim()) as [string, string, string] })),
        feedbackRelease: release,
        tone,
        createdAt: new Date().toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="새 과제 만들기" action={<button type="button" onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-primary-50" aria-label="닫기"><X className="h-5 w-5" /></button>}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <span className="label">루브릭 예시로 빠르게 시작하기</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {rubricTemplates.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="min-h-[64px] rounded-xl border-2 border-primary-100 px-3 font-bold text-primary-900 hover:border-accent-400 hover:bg-accent-50">
                <span className="mr-1" aria-hidden>
                  {t.emoji}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="label">제목</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={60} />
        </label>
        <label className="block">
          <span className="label">안내문</span>
          <textarea className="input min-h-[110px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">마감일</span>
            <input className="input" type="date" value={dueDate} min={todayKst()} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">최소 글자 수</span>
            <input className="input" type="number" min={0} value={minChars} onChange={(e) => setMinChars(Number(e.target.value))} required />
          </label>
          <label className="block">
            <span className="label">최대 글자 수</span>
            <input className="input" type="number" min={1} max={appConfig.ai.maxInputChars} value={maxChars} onChange={(e) => setMaxChars(Number(e.target.value))} required />
          </label>
        </div>
        <div>
          <span className="label">루브릭 (평가 기준 {MIN_CRITERIA}~{MAX_CRITERIA}개, 기준마다 3단계)</span>
          <RubricEditor rubric={rubric} onChange={setRubric} />
        </div>
        <fieldset>
          <legend className="label">AI 피드백 공개 방식</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['instant', '즉시 공개', `${terms.student}이 내자마자 피드백을 봐요.`],
                ['teacher', `${terms.teacher} 확인 후 공개`, `${terms.teacher}이 확인·수정한 뒤 공개해요.`],
              ] as const
            ).map(([value, label, desc]) => (
              <label key={value} className={`flex min-h-touch cursor-pointer gap-3 rounded-xl border-2 p-4 ${release === value ? 'border-primary-700 bg-primary-50' : 'border-primary-100'}`}>
                <input type="radio" name="release" className="mt-1 h-5 w-5 accent-primary-900" checked={release === value} onChange={() => setRelease(value)} />
                <span>
                  <span className="block font-bold">{label}</span>
                  <span className="text-[15px] text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="label">AI 피드백 말투</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(toneGuides) as FeedbackTone[]).map((t) => (
              <button key={t} type="button" aria-pressed={tone === t} onClick={() => setTone(t)} className={`min-h-touch rounded-xl px-4 font-bold ${tone === t ? 'bg-primary-900 text-white' : 'border-2 border-primary-100 text-primary-800'}`}>
                {toneGuides[t].label}
              </button>
            ))}
          </div>
        </fieldset>
        <InlineError message={error} />
        <BigButton full type="submit" loading={busy}>
          과제 내기
        </BigButton>
      </form>
    </Card>
  );
}

export default function ManageAssignments() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const [creating, setCreating] = useState(false);
  const state = useAsync(async () => {
    const [assignments, submissions, members] = await Promise.all([repo.listAssignments(classId), repo.listSubmissions(classId), repo.listMembers(classId)]);
    return { assignments, submissions, studentCount: members.filter((m) => m.role === 'student' && m.approved).length };
  }, [classId]);

  async function remove(a: Assignment) {
    if (!window.confirm(`"${a.title}" 과제와 ${terms.student} 제출물을 모두 지울까요? 되돌릴 수 없어요.`)) return;
    await repo.deleteAssignment(classId, a.id);
    state.reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BookOpenCheck}
        title="과제 관리"
        description="루브릭을 정하면 AI가 그 기준으로 첨삭해요."
        action={!creating && <BigButton icon={Plus} variant="accent" onClick={() => setCreating(true)}>새 과제</BigButton>}
      />
      {creating && (
        <AssignmentForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            state.reload();
          }}
        />
      )}
      {!state.data ? (
        <PageStatus {...state} onRetry={state.reload} />
      ) : state.data.assignments.length === 0 ? (
        <EmptyState title="아직 과제가 없어요">위의 "새 과제" 버튼으로 첫 과제를 만들어 보세요.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {state.data.assignments.map((a) => {
            const subs = state.data?.submissions.filter((s) => s.assignmentId === a.id) ?? [];
            const waiting = subs.filter((s) => s.status === 'waiting').length;
            return (
              <li key={a.id} className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-card">
                <Link to={`/teacher/assignments/${a.id}`} className="flex flex-1 items-center gap-3 rounded-xl p-3 hover:bg-surface">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-primary-950">{a.title}</p>
                      <span className="chip bg-primary-50 text-primary-700">{a.feedbackRelease === 'instant' ? '즉시 공개' : '확인 후 공개'}</span>
                      {waiting > 0 && <span className="chip bg-accent-400 text-primary-950">승인 대기 {waiting}</span>}
                    </div>
                    <p className="mt-1 text-[15px] text-muted">
                      제출 {subs.length}/{state.data?.studentCount}명 · 마감 {formatKstDateTime(a.dueAt)}
                      {isPastDue(a) ? ' (마감됨)' : ''} · {toKstDate(a.createdAt)} 생성
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary-400" aria-hidden />
                </Link>
                <button type="button" onClick={() => remove(a)} className="grid h-12 w-12 place-items-center rounded-xl text-danger hover:bg-red-50" aria-label={`${a.title} 삭제`}>
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
