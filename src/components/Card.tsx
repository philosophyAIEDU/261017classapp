// 흰색 카드. 제목·아이콘·오른쪽 버튼 자리를 넣을 수 있습니다.

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({ title, icon: Icon, action, children, className = '' }: CardProps) {
  return (
    <section className={`print-break rounded-2xl bg-white p-5 shadow-card sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-bold text-primary-900">
            {Icon && (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-50 text-primary-700">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
