// 이 화면이 하는 일: 학생 로그인. 비밀번호를 잊었으면 교사에게 초기화를 요청합니다.
// 고치기 좋은 부분: 안내 문구

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { InlineError } from '../../components/Status';
import { env } from '../../config/env';
import { terms } from '../../config/appConfig';
import { errorMessage } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { AuthShell, Field } from './AuthShell';

export default function StudentLogin() {
  const [classCode, setClassCode] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const setUser = useSession((s) => s.setUser);
  const navigate = useNavigate();

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await setUser(await repo.signInStudent({ classCode, studentNo, password }));
      navigate('/home');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await repo.requestPasswordReset({ classCode, studentNo, name });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const codeAndNo = (
    <>
      <Field label={`${terms.code} (6자리)`}>
        <input className="input uppercase tracking-[0.3em]" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} maxLength={6} required autoComplete="off" />
      </Field>
      <Field label="번호">
        <input className="input" inputMode="numeric" value={studentNo} onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))} required />
      </Field>
    </>
  );

  if (mode === 'reset') {
    return (
      <AuthShell title="비밀번호를 잊었어요" description={`${terms.teacher}께 초기화를 요청해요. ${terms.teacher}이 임시 비밀번호를 알려 줄 거예요.`}>
        {done ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-primary-50 px-4 py-3 font-semibold text-primary-900">요청을 보냈어요! {terms.teacher}께 임시 비밀번호를 받아 주세요.</p>
            <BigButton full variant="outline" onClick={() => { setMode('login'); setDone(false); }}>
              로그인으로 돌아가기
            </BigButton>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {codeAndNo}
            <Field label="이름">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            <InlineError message={error} />
            <BigButton full type="submit" loading={busy}>
              초기화 요청 보내기
            </BigButton>
            <BigButton full variant="ghost" onClick={() => setMode('login')}>
              돌아가기
            </BigButton>
          </form>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="로그인" description={`${terms.room}에 다시 오신 걸 환영해요!`}>
      <form onSubmit={handleLogin} className="space-y-4">
        {codeAndNo}
        <Field label="비밀번호">
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </Field>
        {env.demoMode && env.dataMode === 'local' && (
          <p className="rounded-xl bg-accent-50 px-4 py-3 text-[15px] text-accent-800">
            체험용: {terms.code} <b>DEMO26</b> · 번호 <b>1</b> · 비밀번호 <b>1234</b>
          </p>
        )}
        <InlineError message={error} />
        <BigButton full variant="accent" type="submit" loading={busy}>
          들어가기
        </BigButton>
        <div className="flex items-center justify-between text-[16px]">
          <button type="button" className="min-h-touch font-semibold text-primary-700 underline" onClick={() => { setMode('reset'); setError(null); }}>
            비밀번호를 잊었어요
          </button>
          <Link to="/join" className="flex min-h-touch items-center font-bold text-primary-800 underline">
            처음이에요 · 가입
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
