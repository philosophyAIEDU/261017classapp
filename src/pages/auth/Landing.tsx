// 이 화면이 하는 일: 앱의 첫 화면. 교사는 Google 로그인, 학생은 학급 코드로 입장합니다.
// 고치기 좋은 부분: 문구는 appConfig.ts(앱 이름·기관·슬로건), 기능 소개 카드는 아래 features 배열.

import { BookOpenCheck, CalendarCheck, ChevronRight, MessageCircleQuestion, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Logo, ModeBadge } from '../../components/AppChrome';
import { BigButton } from '../../components/BigButton';
import { InlineError } from '../../components/Status';
import { appConfig, terms } from '../../config/appConfig';
import { env } from '../../config/env';
import { errorMessage } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { Role } from '../../types';

const features = [
  { icon: BookOpenCheck, title: 'AI 첨삭 과제방', text: `${terms.teacher}의 루브릭으로 바로 받는 글쓰기 피드백` },
  { icon: CalendarCheck, title: '학습 루틴 인증', text: '매일 한 칸씩 채우는 잔디 달력과 🔥 불꽃 배지' },
  { icon: MessageCircleQuestion, title: 'AI 탐구 튜터', text: '정답 대신 힌트로, 스스로 생각하게 돕는 튜터' },
];

export default function Landing() {
  const user = useSession((s) => s.user);
  const setUser = useSession((s) => s.setUser);
  const demoSwitch = useSession((s) => s.demoSwitch);
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={user.role === 'teacher' ? '/teacher' : '/home'} replace />;

  async function teacherLogin() {
    setBusy('teacher');
    setError(null);
    try {
      const u = await repo.signInTeacher();
      await setUser(u);
      navigate(u.classId ? '/teacher' : '/teacher/setup');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function tryDemo(role: Role) {
    setBusy(role);
    await demoSwitch(role);
    navigate(role === 'teacher' ? '/teacher' : '/home');
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* 위쪽 네이비 영역 */}
      <div className="relative overflow-hidden bg-primary-900 pb-36 text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-primary-500/40 blur-3xl" aria-hidden />
        <div className="relative mx-auto max-w-5xl px-5 pt-6">
          <Logo light />
          <div className="mt-12 max-w-2xl sm:mt-16">
            <p className="chip bg-white/10 text-accent-200">
              <Sparkles className="h-4 w-4" aria-hidden /> {appConfig.organization}
            </p>
            <h1 className="mt-4 text-[34px] font-extrabold leading-tight tracking-tight sm:text-5xl">
              {terms.room}만의
              <br />
              <span className="text-accent-300">AI 클래스</span>에 오신 걸 환영해요
            </h1>
            <p className="mt-4 text-lg text-primary-100 sm:text-xl">{appConfig.slogan}</p>
          </div>
        </div>
      </div>

      {/* 입장 카드 */}
      <div className="relative mx-auto -mt-28 max-w-5xl px-5">
        <div className="grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-100 text-accent-800">
              <UserRound className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-primary-950">{terms.student}이에요</h2>
            <p className="mt-1 text-muted">{terms.teacher}이 알려 준 학급 코드로 들어와요.</p>
            <div className="mt-6 grid gap-3">
              <BigButton full variant="accent" to="/login" icon={ChevronRight}>
                로그인하기
              </BigButton>
              <BigButton full variant="outline" to="/join">
                처음이에요 · 가입하기
              </BigButton>
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-50 text-primary-800">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-primary-950">{terms.teacher}이에요</h2>
            <p className="mt-1 text-muted">
              {env.dataMode === 'local' ? '이 브라우저에 저장되는 체험용 계정으로 시작해요.' : 'Google 계정으로 안전하게 로그인해요.'}
            </p>
            <div className="mt-6 grid gap-3">
              <BigButton full onClick={teacherLogin} loading={busy === 'teacher'}>
                Google로 시작하기
              </BigButton>
              <InlineError message={error} />
            </div>
          </section>
        </div>

        {env.demoMode && repo.demoSignIn && (
          <section className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-accent-300 bg-accent-50 px-5 py-4 sm:flex-row">
            <p className="font-bold text-accent-800">샘플 데이터로 바로 둘러보기</p>
            <div className="flex w-full gap-2 sm:w-auto">
              <BigButton small variant="primary" className="flex-1" onClick={() => tryDemo('teacher')}>
                {terms.teacher} 화면
              </BigButton>
              <BigButton small variant="outline" className="flex-1" onClick={() => tryDemo('student')}>
                {terms.student} 화면
              </BigButton>
            </div>
          </section>
        )}

        <ul className="mt-10 grid gap-4 pb-16 sm:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="rounded-2xl bg-white p-5 shadow-card">
              <f.icon className="h-7 w-7 text-accent-500" aria-hidden />
              <p className="mt-3 font-extrabold text-primary-950">{f.title}</p>
              <p className="mt-1 text-[16px] text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <ModeBadge />
    </div>
  );
}
