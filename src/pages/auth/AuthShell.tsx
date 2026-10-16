// 로그인·가입 화면의 공통 틀

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo, ModeBadge } from '../../components/AppChrome';

export function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-primary-900 px-5 pb-24 pt-6">
        <div className="mx-auto max-w-md">
          <Link to="/" aria-label="첫 화면으로">
            <Logo light />
          </Link>
        </div>
      </div>
      <div className="mx-auto -mt-16 max-w-md px-5 pb-16">
        <div className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-extrabold text-primary-950">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <ModeBadge />
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[15px] text-muted">{hint}</span>}
    </label>
  );
}
