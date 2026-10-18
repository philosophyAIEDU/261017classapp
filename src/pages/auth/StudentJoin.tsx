// 이 화면이 하는 일: 학생 가입 (학급 코드 + 번호 + 이름 + 비밀번호). 가입 후 교사 승인을 기다립니다.
// 고치기 좋은 부분: 안내 문구, 비밀번호 최소 길이(MIN_PASSWORD)

import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { InlineError } from '../../components/Status';
import { terms } from '../../config/appConfig';
import { errorMessage } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import { AuthShell, Field } from './AuthShell';

const MIN_PASSWORD = 4;

export default function StudentJoin() {
  const [params] = useSearchParams();
  const [classCode, setClassCode] = useState(params.get('code') ?? '');
  const [studentNo, setStudentNo] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useSession((s) => s.setUser);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(`비밀번호는 ${MIN_PASSWORD}자 이상으로 정해 주세요.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setUser(await repo.signUpStudent({ classCode, studentNo, name, password }));
      navigate('/home');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={`${terms.room}에 가입하기`} description="이메일이나 전화번호는 필요 없어요.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={`${terms.code} (6자리)`}>
          <input className="input uppercase tracking-[0.3em]" value={classCode} onChange={(e) => setClassCode(e.target.value.toUpperCase())} maxLength={6} required autoComplete="off" />
        </Field>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Field label="번호">
            <input className="input" inputMode="numeric" value={studentNo} onChange={(e) => setStudentNo(e.target.value.replace(/\D/g, ''))} required />
          </Field>
          <Field label="이름">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={20} />
          </Field>
        </div>
        <Field label="비밀번호" hint={`${MIN_PASSWORD}자 이상, 나만 아는 비밀번호로 정해요.`}>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
        </Field>
        <InlineError message={error} />
        <BigButton full variant="accent" type="submit" loading={busy}>
          가입 신청하기
        </BigButton>
        <p className="text-center text-muted">
          이미 가입했나요?{' '}
          <Link to="/login" className="inline-block min-h-touch py-3 font-bold text-primary-800 underline">
            로그인
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
