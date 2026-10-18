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
  { icon: BookOpenCheck, title: 'AI 영작 첨삭', text: `${terms.teacher}의 루브릭으로 바로 받는 영작 피드백` },
  { icon: CalendarCheck, title: '학습 루틴 인증', text: '단어·듣기·쉐도잉, 매일 채우는 잔디 달력과 🔥 배지' },
  { icon: MessageCircleQuestion, title: 'AI 영어 튜터', text: '정답 대신 힌트로, 스스로 문장을 만들게 돕는 튜터' },
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
      <header className="landing-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Logo />
          <span className="hidden text-sm font-semibold text-muted sm:block">{appConfig.organization} · ENGLISH LEARNING</span>
        </div>
      </header>
      <section className="landing-hero text-primary-950" aria-labelledby="welcome-title">
        <div className="hero-layout mx-auto max-w-6xl px-5 sm:px-8">
          <div className="hero-copy">
            <p className="hero-eyebrow"><Sparkles className="h-4 w-4" aria-hidden /> 매일의 배움이, 내일의 자신감으로</p>
            <h1 id="welcome-title" className="hero-title">
              영어를 배우는 시간,<br />
              <span>자신감이 자라는 순간.</span>
            </h1>
            <p className="hero-description">{appConfig.slogan}.<br className="hidden sm:block" /> 작은 도전부터 빛나는 성장까지 함께해요.</p>
            <div className="hero-subjects" aria-label="학습 영역">
              <span>Writing · 쓰기</span><span>Habits · 습관</span><span>Discovery · 탐구</span>
            </div>
          </div>
          <figure className="hero-artwork">
            <img src="/english-learning-pencil.png" alt="아이들이 함께 웃으며 영어책을 읽고 단어를 배우는 색연필 그림" width="1536" height="1024" fetchPriority="high" />
            <figcaption><span aria-hidden>✦</span> 함께 배우는 즐거움, 스스로 자라는 힘</figcaption>
          </figure>
        </div>
      </section>

      {/* 입장 카드 */}
      <div className="landing-content relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="entry-grid grid gap-5 md:grid-cols-2">
          <section className="entry-card rounded-3xl border border-primary-100/70 bg-white p-6 shadow-card sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-100 text-accent-800">
              <UserRound className="h-6 w-6" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-primary-950">{terms.student}이에요</h2>
            <p className="mt-1 text-muted">{terms.teacher}이 알려 준 {terms.code}로 들어와요.</p>
            <div className="mt-6 grid gap-3">
              <BigButton full variant="accent" to="/login" icon={ChevronRight}>
                로그인하기
              </BigButton>
              <BigButton full variant="outline" to="/join">
                처음이에요 · 가입하기
              </BigButton>
            </div>
          </section>

          <section className="entry-card rounded-3xl border border-primary-100/70 bg-white p-6 shadow-card sm:p-8">
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
          <section className="demo-invitation mt-5 flex flex-col items-center justify-between gap-3 rounded-2xl border border-primary-100 bg-primary-50/50 px-5 py-4 sm:flex-row">
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

        <div className="learning-section-heading">
          <p className="text-xs font-bold tracking-[0.18em] text-primary-600">A LITTLE EVERY DAY</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-primary-950">즐겁게 시작하고, 꾸준히 성장해요</h2>
          <p className="mt-2 text-muted">우리 아이의 영어에 힘을 더하는 세 가지 학습 경험</p>
        </div>
        <ul className="feature-cards grid gap-4 pb-12 sm:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="rounded-2xl bg-white p-5 shadow-card">
              <f.icon className="h-7 w-7 text-accent-500" aria-hidden />
              <p className="mt-3 font-extrabold text-primary-950">{f.title}</p>
              <p className="mt-1 text-[16px] text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <footer className="landing-footer">{appConfig.organization}<span aria-hidden> · </span>아이들의 가능성을 함께 키워갑니다.</footer>
      <ModeBadge />
    </div>
  );
}
