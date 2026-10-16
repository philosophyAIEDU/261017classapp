// 화면 문지기: 로그인 안 했으면 첫 화면으로, 역할이 다르면 "볼 수 없어요", 승인 전 학생은 "승인 대기".

import { Hourglass, Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { terms } from '../config/appConfig';
import { useSession } from '../store/sessionStore';
import type { ModuleKey, Role } from '../types';
import { isModuleOn } from '../utils/modules';
import { BigButton } from './BigButton';

function Blocked({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children: ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary-700">
        <Icon className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-extrabold text-primary-950">{title}</h1>
      <div className="mt-2 space-y-4 text-muted">{children}</div>
    </div>
  );
}

export function RequireRole({ role, module, children }: { role: Role; module?: ModuleKey; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const classRoom = useSession((s) => s.classRoom);
  const refreshUser = useSession((s) => s.refreshUser);
  const location = useLocation();

  if (!user) return <Navigate to="/" replace />;

  if (user.role !== role) {
    return (
      <Blocked icon={Lock} title={role === 'teacher' ? `${terms.teacher}만 볼 수 있는 화면이에요` : `${terms.student} 화면이에요`}>
        <p>내 화면으로 돌아가 주세요.</p>
        <BigButton full to={user.role === 'teacher' ? '/teacher' : '/home'}>
          내 화면으로 가기
        </BigButton>
      </Blocked>
    );
  }

  if (role === 'teacher' && !user.classId && location.pathname !== '/teacher/setup') {
    return <Navigate to="/teacher/setup" replace />;
  }

  if (role === 'student' && !user.approved) {
    return (
      <Blocked icon={Hourglass} title={`${terms.teacher}의 승인을 기다리고 있어요`}>
        <p>
          가입 신청이 잘 접수되었어요. {terms.teacher}이 승인하면 바로 시작할 수 있어요.
        </p>
        <BigButton full variant="outline" onClick={() => refreshUser()}>
          승인되었는지 다시 확인
        </BigButton>
      </Blocked>
    );
  }

  if (module && !isModuleOn(classRoom, module)) {
    return (
      <Blocked icon={Lock} title="지금은 꺼져 있는 기능이에요">
        <BigButton full to={role === 'teacher' ? '/teacher' : '/home'}>
          홈으로
        </BigButton>
      </Blocked>
    );
  }

  return <>{children}</>;
}
