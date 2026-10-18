// 화면 테두리 요소: 데모 전환 막대, 모드 배지, 로고

import { GraduationCap, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appConfig, terms } from '../config/appConfig';
import { env } from '../config/env';
import { repo } from '../repositories';
import { useAiSettings, useModeLabel } from '../store/aiSettingsStore';
import { useSession } from '../store/sessionStore';
import type { Role } from '../types';

export function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-400 text-primary-950">
        <GraduationCap className="h-6 w-6" aria-hidden />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-primary-950'}`}>{appConfig.appName}</span>
    </span>
  );
}

/** 화면 아래 작은 배지: 지금 어떤 모드로 동작하는지 */
export function ModeBadge() {
  const label = useModeLabel();
  const aiMode = useAiSettings((s) => s.mode);
  return (
    <div className="no-print pointer-events-none fixed bottom-[84px] right-3 z-30 sm:bottom-3">
      <span className="chip pointer-events-auto border border-primary-100 bg-white/95 text-[13px] text-primary-700 shadow-card">
        <span className={`h-2 w-2 rounded-full ${aiMode === 'mock' ? 'bg-accent-400' : 'bg-success'}`} aria-hidden />
        {label}
      </span>
    </div>
  );
}

/** 데모 모드: "교사로 보기 / 학생으로 보기" 전환 */
export function DemoBar() {
  const user = useSession((s) => s.user);
  const demoSwitch = useSession((s) => s.demoSwitch);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!env.demoMode || !repo.demoSignIn) return null;

  async function switchTo(role: Role) {
    setBusy(true);
    await demoSwitch(role);
    setBusy(false);
    navigate(role === 'teacher' ? '/teacher' : '/home');
  }

  async function reset() {
    if (!window.confirm('샘플 데이터를 처음 상태로 되돌릴까요? 직접 입력한 내용은 지워져요.')) return;
    setBusy(true);
    await repo.resetDemoData?.();
    await demoSwitch(user?.role === 'student' ? 'student' : 'teacher');
    setBusy(false);
  }

  const tab = (role: Role, label: string) => {
    const active = user?.role === role;
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => switchTo(role)}
        aria-pressed={active}
        className={`min-h-touch whitespace-nowrap rounded-lg px-3 text-[15px] font-bold transition-colors ${active ? 'bg-accent-400 text-primary-950' : 'text-white hover:bg-white/10'}`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="no-print bg-primary-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-1.5">
        <span className="hidden text-[14px] font-semibold text-primary-200 sm:inline">체험용 데모</span>
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
          {tab('teacher', `${terms.teacher}으로 보기`)}
          {tab('student', `${terms.student}으로 보기`)}
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={busy}
          className="flex min-h-touch items-center gap-1 rounded-lg px-2 text-[14px] font-semibold text-primary-200 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> <span className="sr-only sm:not-sr-only">샘플 초기화</span>
        </button>
      </div>
    </div>
  );
}
