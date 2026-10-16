// 이 화면이 하는 일: 오늘의 루틴 인증(글 + 사진 0~2장, 하루 1번, 당일 수정 가능)과 달성률·연속 기록·잔디 달력.
// 고치기 좋은 부분: 글자 수·사진 장수는 appConfig.routines, 안내 문구

import { CalendarCheck, CheckCircle2, PenLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { GrassCalendar } from '../../components/GrassCalendar';
import { PageHeader } from '../../components/PageHeader';
import { PhotoUploader, type PhotoItem } from '../../components/PhotoUploader';
import { ProgressBar } from '../../components/ProgressBar';
import { EmptyState, InlineError, PageStatus, PrivacyNotice } from '../../components/Status';
import { StoredImage } from '../../components/StoredImage';
import { StreakBadge } from '../../components/StreakBadge';
import { appConfig } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { repo, routineLogId } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { Routine, RoutineLog } from '../../types';
import { formatKstShort, formatMonthDay, todayKst } from '../../utils/kstDate';
import { achievementRate, describeDays, isRoutineDay, routineStreak } from '../../utils/stats';

function TodayForm({ routine, todayLog, onSaved }: { routine: Routine; todayLog: RoutineLog | undefined; onSaved: (log: RoutineLog) => void }) {
  const user = useSession((s) => s.user);
  const [editing, setEditing] = useState(!todayLog);
  const [text, setText] = useState(todayLog?.text ?? '');
  const [photos, setPhotos] = useState<PhotoItem[]>(todayLog?.imageUrls.map((url) => ({ url })) ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayKst();

  useEffect(() => {
    setEditing(!todayLog);
    setText(todayLog?.text ?? '');
    setPhotos(todayLog?.imageUrls.map((url) => ({ url })) ?? []);
  }, [todayLog, routine.id]);

  if (!user?.classId) return null;
  const classId = user.classId;

  async function save() {
    if (!user) return;
    if (!text.trim()) {
      setError('한 줄이라도 오늘 한 일을 적어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const imageUrls: string[] = [];
      for (const p of photos) {
        if (p.url) imageUrls.push(p.url);
        else if (p.file) imageUrls.push(await repo.uploadPhoto(classId, user.uid, p.file));
      }
      const now = new Date().toISOString();
      const log: RoutineLog = {
        id: routineLogId(routine.id, user.uid, today), // 하루 1개만 생기도록 아이디를 고정
        classId,
        routineId: routine.id,
        uid: user.uid,
        date: today,
        text: text.trim(),
        imageUrls,
        createdAt: todayLog?.createdAt ?? now,
        updatedAt: now,
      };
      await repo.saveRoutineLog(log);
      onSaved(log);
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (!isRoutineDay(routine, today)) {
    return <EmptyState title="오늘은 쉬는 날이에요">{describeDays(routine.days)} 하는 루틴이에요.</EmptyState>;
  }

  if (todayLog && !editing) {
    return (
      <div className="space-y-3">
        <p className="flex items-center gap-2 font-bold text-success">
          <CheckCircle2 className="h-6 w-6" aria-hidden /> 오늘 인증 완료!
        </p>
        <p className="whitespace-pre-wrap rounded-xl bg-surface px-4 py-3">{todayLog.text}</p>
        {todayLog.imageUrls.length > 0 && (
          <div className="flex gap-2">
            {todayLog.imageUrls.map((url, i) => (
              <StoredImage key={url} url={url} alt={`오늘 인증 사진 ${i + 1}`} className="h-24 w-24 rounded-xl" />
            ))}
          </div>
        )}
        <BigButton variant="outline" icon={PenLine} onClick={() => setEditing(true)}>
          오늘 인증 고치기
        </BigButton>
        <p className="text-[15px] text-muted">인증은 하루에 한 번이에요. 오늘 안에는 몇 번이든 고칠 수 있어요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PrivacyNotice />
      {routine.description && <p className="font-semibold text-primary-800">{routine.description}</p>}
      <label className="block">
        <span className="label">오늘 한 일</span>
        <textarea
          className="input min-h-[120px]"
          value={text}
          maxLength={appConfig.routines.maxTextLength}
          onChange={(e) => setText(e.target.value)}
          placeholder="예: apple, banana, cherry 를 외웠어요!"
        />
      </label>
      <p className="-mt-2 text-right text-[15px] text-muted">
        {text.length}/{appConfig.routines.maxTextLength}자
      </p>
      <PhotoUploader items={photos} onChange={setPhotos} />
      <InlineError message={error} />
      <div className="flex gap-2">
        {todayLog && (
          <BigButton variant="outline" onClick={() => setEditing(false)}>
            취소
          </BigButton>
        )}
        <BigButton full variant="accent" onClick={save} loading={busy}>
          {todayLog ? '고친 내용 저장' : '오늘 인증하기'}
        </BigButton>
      </div>
    </div>
  );
}

export default function Routines() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const uid = user?.uid ?? '';
  const today = todayKst();
  const [params, setParams] = useSearchParams();

  const state = useAsync(async () => {
    const [routines, logs] = await Promise.all([repo.listRoutines(classId), repo.listRoutineLogs(classId, { uid })]);
    return { routines: routines.filter((r) => r.startDate <= today), logs };
  }, [classId, uid, today]);

  const [logs, setLogs] = useState<RoutineLog[]>([]);
  useEffect(() => setLogs(state.data?.logs ?? []), [state.data]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const { routines } = state.data;

  const header = <PageHeader icon={CalendarCheck} title="학습 루틴 인증" description="매일 조금씩, 잔디를 초록색으로 채워 봐요." />;
  if (routines.length === 0) {
    return (
      <div>
        {header}
        <EmptyState title="아직 루틴이 없어요" />
      </div>
    );
  }

  const routine = routines.find((r) => r.id === params.get('id')) ?? routines[0];
  const myLogs = logs.filter((l) => l.routineId === routine.id);
  const dates = myLogs.map((l) => l.date);
  const todayLog = myLogs.find((l) => l.date === today);
  const rate = achievementRate(routine, dates, today);
  const streak = routineStreak(routine, dates, today);
  const recent = [...myLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-5">
      {header}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="루틴 고르기">
        {routines.map((r) => {
          const done = logs.some((l) => l.routineId === r.id && l.date === today);
          return (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={r.id === routine.id}
              onClick={() => setParams({ id: r.id })}
              className={`flex min-h-touch shrink-0 items-center gap-2 rounded-xl px-4 font-bold ${r.id === routine.id ? 'bg-primary-900 text-white' : 'bg-white text-primary-800 shadow-card'}`}
            >
              {done && <CheckCircle2 className="h-5 w-5 text-success" aria-label="오늘 완료" />}
              {r.title}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card title={`오늘 · ${formatKstShort(new Date())}`} icon={PenLine}>
          <TodayForm routine={routine} todayLog={todayLog} onSaved={(log) => setLogs((prev) => [...prev.filter((l) => l.id !== log.id), log])} />
        </Card>
        <div className="space-y-5">
          <StreakBadge streak={streak} />
          <Card title="나의 기록">
            <div className="space-y-5">
              <ProgressBar value={rate} label={`달성률 (${describeDays(routine.days)})`} />
              <GrassCalendar today={today} loggedDates={dates} isScheduled={(d) => isRoutineDay(routine, d)} />
            </div>
          </Card>
        </div>
      </div>

      {recent.length > 0 && (
        <Card title="최근 인증">
          <ul className="divide-y divide-primary-100">
            {recent.map((l) => (
              <li key={l.id} className="flex gap-3 py-3">
                <span className="w-14 shrink-0 font-bold text-primary-700">{formatMonthDay(l.date)}</span>
                <span className="flex-1 whitespace-pre-wrap">{l.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
