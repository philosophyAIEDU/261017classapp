// 큰 버튼 (터치 영역 48px 이상). to 를 주면 링크, 아니면 버튼이 됩니다.

import { Loader2, type LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Variant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-950',
  accent: 'bg-accent-400 text-primary-950 hover:bg-accent-300 active:bg-accent-500',
  outline: 'border-2 border-primary-200 bg-white text-primary-900 hover:border-primary-400',
  ghost: 'bg-transparent text-primary-800 hover:bg-primary-50',
  danger: 'bg-white border-2 border-danger/30 text-danger hover:bg-red-50',
};

interface BigButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  full?: boolean;
  small?: boolean;
  to?: string;
}

export function BigButton({ children, variant = 'primary', icon: Icon, loading, full, small, to, className = '', disabled, ...rest }: BigButtonProps) {
  const classes = [
    'inline-flex items-center justify-center gap-2 rounded-xl text-center font-bold transition-colors select-none',
    small ? 'min-h-touch px-4 text-[16px]' : 'min-h-[56px] px-6 text-[17px]',
    variants[variant],
    full ? 'w-full' : '',
    disabled || loading ? 'opacity-50 pointer-events-none' : '',
    className,
  ].join(' ');

  const content = (
    <>
      {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : Icon && <Icon className="h-5 w-5" aria-hidden />}
      <span>{children}</span>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
