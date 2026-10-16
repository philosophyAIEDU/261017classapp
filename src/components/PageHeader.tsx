// 화면 맨 위 제목 영역

import { ChevronLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  icon?: LucideIcon;
  backTo?: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon: Icon, backTo, action }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {backTo && (
        <Link to={backTo} className="no-print mb-2 inline-flex min-h-touch items-center gap-1 font-semibold text-primary-700 hover:text-primary-900">
          <ChevronLeft className="h-5 w-5" aria-hidden /> 목록으로
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-900 text-accent-300">
              <Icon className="h-6 w-6" aria-hidden />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-primary-950 sm:text-[28px]">{title}</h1>
            {description && <p className="mt-0.5 text-muted">{description}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}
