// 이 화면이 하는 일: 가입 승인, 비밀번호 초기화 요청 처리, 구성원 목록.
// 고치기 좋은 부분: 안내 문구

import { Check, ChevronRight, KeyRound, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, InlineError, PageStatus } from '../../components/Status';
import { terms } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { Member } from '../../types';
import { formatKstDateTime } from '../../utils/kstDate';

export default function Members() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const state = useAsync(() => repo.listMembers(classId), [classId]);
  const [tempPasswords, setTempPasswords] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      state.reload();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function reset(m: Member) {
    if (!window.confirm(`${m.name}의 비밀번호를 임시 비밀번호로 바꿀까요?`)) return;
    await run(async () => {
      const temp = await repo.resetStudentPassword(classId, m.uid);
      setTempPasswords((prev) => ({ ...prev, [m.uid]: temp }));
    });
  }

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;
  const students = state.data.filter((m) => m.role === 'student');
  const pending = students.filter((m) => !m.approved);
  const resets = students.filter((m) => m.approved && (m.resetRequested || tempPasswords[m.uid]));
  const approved = students.filter((m) => m.approved);

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="구성원" description={`${terms.student} 가입을 승인하고 비밀번호 요청을 처리해요.`} />
      <InlineError message={error} />

      <Card title="가입 승인 대기" action={<span className="chip bg-accent-100 text-accent-800">{pending.length}명</span>}>
        {pending.length === 0 ? (
          <EmptyState title={`기다리는 ${terms.student}이 없어요`} />
        ) : (
          <ul className="space-y-2">
            {pending.map((m) => (
              <li key={m.uid} className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-100 px-4 py-3">
                <span className="flex-1">
                  <span className="block font-bold">
                    {m.studentNo}번 {m.name}
                  </span>
                  <span className="text-[15px] text-muted">{formatKstDateTime(m.joinedAt)} 신청</span>
                </span>
                <BigButton small variant="accent" icon={Check} onClick={() => run(() => repo.approveMember(classId, m.uid))}>
                  승인
                </BigButton>
                <BigButton small variant="danger" onClick={() => window.confirm(`${m.name}의 가입 신청을 거절할까요?`) && run(() => repo.removeMember(classId, m.uid))}>
                  거절
                </BigButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="비밀번호 초기화 요청" icon={KeyRound}>
        {resets.length === 0 ? (
          <EmptyState title="요청이 없어요" />
        ) : (
          <ul className="space-y-2">
            {resets.map((m) => (
              <li key={m.uid} className="flex flex-wrap items-center gap-3 rounded-xl border border-primary-100 px-4 py-3">
                <span className="flex-1 font-bold">
                  {m.studentNo}번 {m.name}
                </span>
                {tempPasswords[m.uid] ? (
                  <span className="rounded-xl bg-accent-100 px-4 py-2 font-bold text-primary-950">
                    임시 비밀번호: <span className="font-mono text-xl tracking-widest">{tempPasswords[m.uid]}</span>
                  </span>
                ) : (
                  <BigButton small onClick={() => reset(m)}>
                    임시 비밀번호 만들기
                  </BigButton>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[15px] text-muted">임시 비밀번호는 이 화면에서 한 번만 보여요. {terms.student}에게 직접 알려 주세요.</p>
      </Card>

      <Card title={`${terms.student} 목록`} action={<span className="chip bg-primary-50 text-primary-800">{approved.length}명</span>}>
        {approved.length === 0 ? (
          <EmptyState title={`아직 ${terms.student}이 없어요`}>
            <Link to="/teacher/qr" className="font-bold text-primary-800 underline">
              입장 QR 보여 주기
            </Link>
          </EmptyState>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {approved.map((m) => (
              <li key={m.uid} className="flex items-center gap-1 rounded-xl border border-primary-100">
                <Link to={`/teacher/members/${m.uid}`} className="flex min-h-touch flex-1 items-center justify-between px-4 py-2 font-semibold hover:bg-surface">
                  {m.studentNo}. {m.name}
                  <ChevronRight className="h-4 w-4 text-primary-400" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => window.confirm(`${m.name}을(를) ${terms.group}에서 내보낼까요?`) && run(() => repo.removeMember(classId, m.uid))}
                  className="grid h-12 w-12 place-items-center text-primary-300 hover:text-danger"
                  aria-label={`${m.name} 내보내기`}
                >
                  <UserMinus className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
