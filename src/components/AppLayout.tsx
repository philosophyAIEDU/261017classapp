// 로그인 후 화면의 공통 틀: 머리글 + 메뉴 + 본문. 학생은 휴대폰 아래쪽 탭, 교사는 위쪽 메뉴.

import {
  Bot,
  BookOpenCheck,
  CalendarCheck,
  FolderHeart,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircleQuestion,
  QrCode,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useSession } from '../store/sessionStore';
import type { ModuleKey } from '../types';
import { isModuleOn } from '../utils/modules';
import { DemoBar, Logo, ModeBadge } from './AppChrome';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module?: ModuleKey;
  end?: boolean;
}

const studentNav: NavItem[] = [
  { to: '/home', label: '홈', icon: Home },
  { to: '/assignments', label: '과제', icon: BookOpenCheck, module: 'assignments' },
  { to: '/routines', label: '루틴', icon: CalendarCheck, module: 'routines' },
  { to: '/tutor', label: '튜터', icon: MessageCircleQuestion, module: 'tutor' },
  { to: '/portfolio', label: '포트폴리오', icon: FolderHeart, module: 'assignments' },
];

const teacherNav: NavItem[] = [
  { to: '/teacher', label: '대시보드', icon: LayoutDashboard, end: true },
  { to: '/teacher/assignments', label: '과제 관리', icon: BookOpenCheck, module: 'assignments' },
  { to: '/teacher/routines', label: '루틴 관리', icon: CalendarCheck, module: 'routines' },
  { to: '/teacher/tutors', label: '튜터 관리', icon: MessageCircleQuestion, module: 'tutor' },
  { to: '/teacher/members', label: '구성원', icon: Users },
  { to: '/teacher/qr', label: '입장 QR', icon: QrCode },
  { to: '/teacher/settings', label: 'AI 설정', icon: Bot },
];

export function AppLayout() {
  const user = useSession((s) => s.user);
  const classRoom = useSession((s) => s.classRoom);
  const signOut = useSession((s) => s.signOut);
  const navigate = useNavigate();

  const isTeacher = user?.role === 'teacher';
  const items = (isTeacher ? teacherNav : studentNav).filter((i) => !i.module || isModuleOn(classRoom, i.module));

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="min-h-screen pb-28 sm:pb-12">
      <DemoBar />
      <header className="no-print sticky top-0 z-20 border-b border-primary-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <NavLink to={isTeacher ? '/teacher' : '/home'} className="min-w-0">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-2">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-[15px] font-bold text-primary-900">{user?.name}</p>
              {classRoom && <p className="text-[14px] text-muted">{classRoom.name}</p>}
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-touch items-center gap-1.5 rounded-xl px-3 font-semibold text-primary-700 hover:bg-primary-50"
            >
              <LogOut className="h-5 w-5" aria-hidden />
              <span className="hidden sm:inline">로그아웃</span>
              <span className="sr-only sm:hidden">로그아웃</span>
            </button>
          </div>
        </div>
        {/* 넓은 화면(태블릿·노트북) 메뉴 */}
        <nav className={`mx-auto max-w-6xl gap-1 overflow-x-auto px-3 pb-2 ${isTeacher ? 'flex' : 'hidden sm:flex'}`} aria-label="주 메뉴">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-touch shrink-0 items-center gap-2 rounded-xl px-4 font-semibold transition-colors ${
                  isActive ? 'bg-primary-900 text-white' : 'text-primary-800 hover:bg-primary-50'
                }`
              }
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* 학생 휴대폰 아래쪽 탭 */}
      {!isTeacher && (
        <nav className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-primary-100 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="아래 메뉴">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-h-[64px] flex-col items-center justify-center gap-0.5 text-[13px] font-bold ${isActive ? 'text-primary-900' : 'text-primary-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`grid h-8 w-12 place-items-center rounded-full ${isActive ? 'bg-accent-100' : ''}`}>
                      <item.icon className="h-5 w-5" aria-hidden />
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <ModeBadge />
    </div>
  );
}
