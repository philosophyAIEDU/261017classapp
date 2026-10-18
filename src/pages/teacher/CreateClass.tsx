// 이 화면이 하는 일: 교사가 처음 로그인하면 학급을 만듭니다. 6자리 학급 코드는 자동으로 만들어져요.
// 고치기 좋은 부분: 학급 이름 예시(placeholder)

import { School } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { InlineError } from '../../components/Status';
import { terms } from '../../config/appConfig';
import { errorMessage } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';

export default function CreateClass() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshUser = useSession((s) => s.refreshUser);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await repo.createClass(name);
      await refreshUser();
      navigate('/teacher/qr');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader icon={School} title={`${terms.group} 만들기`} description={`${terms.student}들이 들어올 ${terms.room}을 만들어요.`} />
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="label">{terms.group} 이름</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 중급 회화 A반, 토요 영작반" required maxLength={30} />
          </label>
          <InlineError message={error} />
          <BigButton full type="submit" loading={busy}>
            만들고 입장 코드 받기
          </BigButton>
        </form>
      </Card>
    </div>
  );
}
