// 이 화면이 하는 일: 루틴 만들기(매일/요일, 기간)와 학생 × 날짜 인증 현황표, 오늘 미인증자 목록.
// 고치기 좋은 부분: 현황표에 보여 줄 날 수(GRID_DAYS), 루틴 예시(EXAMPLES)

import { CalendarCheck, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { StatusGrid } from '../../components/StatusGrid';
import { StoredImage } from '../../components/StoredImage';
import { EmptyState, InlineError, PageStatus } from '../../components/Status';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { Routine } from '../../types';
import { createId } from '../../utils/id';
import { addDaysKst, datesBetween, formatMonthDay, todayKst } from '../../utils/kstDate';
import { describeDays, isRoutineDay, percent } from '../../utils/stats';

const GRID_DAYS = 14;
const EXAMPLES = ['영단어 20개 외우기', '수학 오답노트 1문제', '독서 15분'];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function RoutineForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const user = useSession((s) => s.user);
  const today = todayKst();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(addDaysKst(today, 27));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.classId) return;
    if (endDate < startDate) {
      setError('끝나는 날은 시작하는 날보다 뒤여야 해요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await repo.saveRoutine({ id: createId('r-'), classId: user.classId, title: title.trim(), description: description.trim(), days, startDate, endDate, createdAt: new Date().toISOString() });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="새 루틴 만들기" action={<button type="button" onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-primary-50" aria-label="닫기"><X className="h-5 w-5" /></button>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button key={ex} type="button" onClick={() => setTitle(ex)} className="chip min-h-touch bg-surface px-4 text-[15px] text-primary-800 hover:bg-accent-50">
              {ex}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="label">루틴 이름</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={40} />
        </label>
        <label className="block">
          <span className="label">인증 방법 안내 (선택)</span>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="예: 외운 단어 중 어려웠던 3개를 적어 주세요." />
        </label>
        <fieldset>
          <legend className="label">하는 날 ({describeDays(days)})</legend>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={days.length === 0} onClick={() => setDays([])} className={`h-12 rounded-xl px-4 font-bold ${days.length === 0 ? 'bg-primary-900 text-white' : 'bg-surface text-primary-800'}`}>
              매일
            </button>
            {DAY_NAMES.map((name, d) => {
              const on = days.includes(d);
              return (
                <button key={name} type="button" aria-pressed={on} onClick={() => setDays(on ? days.filter((x) => x !== d) : [...days, d])} className={`h-12 w-12 rounded-xl font-bold ${on ? 'bg-accent-400 text-primary-950' : 'bg-surface text-primary-800'}`}>
                  {name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">시작하는 날</span>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">끝나는 날</span>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </label>
        </div>
        <InlineError message={error} />
        <BigButton full type="submit" loading={busy}>
          루틴 시작하기
        </BigButton>
      </form>
    </Card>
  );
}

export default function ManageRoutines() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const today = todayKst();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [routines, logs, members] = await Promise.all([repo.listRoutines(classId), repo.listRoutineLogs(classId), repo.listMembers(classId)]);
    return { routines, logs, students: members.filter((m) => m.role === 'student' && m.approved) };
  }, [classId]);

  async function remove(r: Routine) {
    if (!window.confirm(`"${r.title}" 루틴과 인증 기록을 모두 지울까요?`)) return;
    await repo.deleteRoutine(classId, r.id);
    setSelectedId(null);
    state.reload();
  }

  const header = (
    <PageHeader icon={CalendarCheck} title="루틴 관리" description="매일의 작은 습관을 함께 만들어요." action={!creating && <BigButton icon={Plus} variant="accent" onClick={() => setCreating(true)}>새 루틴</BigButton>} />
  );

  if (!state.data) {
    return (
      <div>
        {header}
        <PageStatus {...state} onRetry={state.reload} />
      </div>
    );
  }
  const { routines, logs, students } = state.data;
  const routine = routines.find((r) => r.id === selectedId) ?? routines[0];

  const gridStart = routine ? (addDaysKst(today, -(GRID_DAYS - 1)) > routine.startDate ? addDaysKst(today, -(GRID_DAYS - 1)) : routine.startDate) : today;
  const dates = routine && gridStart <= today ? datesBetween(gridStart, today) : [];
  const routineLogs = routine ? logs.filter((l) => l.routineId === routine.id) : [];
  const todayLogs = routineLogs.filter((l) => l.date === today);
  const missing = students.filter((s) => !todayLogs.some((l) => l.uid === s.uid));
  const scheduledToday = routine ? isRoutineDay(routine, today) : false;

  return (
    <div className="space-y-5">
      {header}
      {creating && (
        <RoutineForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            state.reload();
          }}
        />
      )}
      {!routine ? (
        <EmptyState title="아직 루틴이 없어요" />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
            {routines.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={r.id === routine.id} onClick={() => setSelectedId(r.id)} className={`min-h-touch shrink-0 rounded-xl px-4 font-bold ${r.id === routine.id ? 'bg-primary-900 text-white' : 'bg-white text-primary-800 shadow-card'}`}>
                {r.title}
              </button>
            ))}
          </div>

          <Card
            title={routine.title}
            action={
              <button type="button" onClick={() => remove(routine)} className="flex min-h-touch items-center gap-1 rounded-xl px-3 font-semibold text-danger hover:bg-red-50">
                <Trash2 className="h-5 w-5" aria-hidden /> 삭제
              </button>
            }
          >
            <p className="mb-4 text-muted">
              {describeDays(routine.days)} · {formatMonthDay(routine.startDate)} ~ {formatMonthDay(routine.endDate)}
              {scheduledToday && ` · 오늘 인증 ${todayLogs.length}/${students.length}명 (${percent(todayLogs.length, students.length)}%)`}
            </p>
            {dates.length > 0 ? (
              <StatusGrid students={students} dates={dates} today={today} isScheduled={(d) => isRoutineDay(routine, d)} isDone={(uid, d) => routineLogs.some((l) => l.uid === uid && l.date === d)} />
            ) : (
              <EmptyState title="아직 시작 전인 루틴이에요" />
            )}
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card title="오늘 미인증" action={<span className="chip bg-accent-100 text-accent-800">{scheduledToday ? `${missing.length}명` : '쉬는 날'}</span>}>
              {!scheduledToday ? (
                <EmptyState title="오늘은 쉬는 날이에요" />
              ) : missing.length === 0 ? (
                <EmptyState title="모두 인증했어요! 🎉" />
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {missing.map((s) => (
                    <li key={s.uid} className="chip bg-surface px-4 py-2 text-[16px] text-primary-900">
                      {s.studentNo}. {s.name}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="오늘 올라온 인증">
              {todayLogs.length === 0 ? (
                <EmptyState title="아직 없어요" />
              ) : (
                <ul className="divide-y divide-primary-100">
                  {todayLogs.map((l) => (
                    <li key={l.id} className="py-3">
                      <p className="font-bold">{students.find((s) => s.uid === l.uid)?.name}</p>
                      <p className="whitespace-pre-wrap text-muted">{l.text}</p>
                      {l.imageUrls.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {l.imageUrls.map((url, i) => (
                            <StoredImage key={url} url={url} alt={`인증 사진 ${i + 1}`} className="h-20 w-20 rounded-lg" />
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
