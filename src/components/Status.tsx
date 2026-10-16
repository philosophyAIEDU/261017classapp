// 불러오는 중 · 오류 · 비어 있음 · 개인정보 안내 같은 상태 표시 모음

import { AlertCircle, Inbox, Loader2, ShieldAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { BigButton } from './BigButton';

export function LoadingState({ message = '불러오는 중이에요…' }: { message?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-14 text-center text-primary-800">
      <Loader2 className="h-9 w-9 animate-spin text-accent-500" aria-hidden />
      <p className="font-semibold">{message}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
      <AlertCircle className="h-8 w-8 text-danger" aria-hidden />
      <p className="font-semibold text-danger">{message}</p>
      {onRetry && (
        <BigButton small variant="outline" onClick={onRetry}>
          다시 시도
        </BigButton>
      )}
    </div>
  );
}

/** useAsync 결과가 아직 없을 때 보여 줄 화면 */
export function PageStatus({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (loading) return <LoadingState />;
  return null;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary-100 px-5 py-10 text-center">
      <Inbox className="h-9 w-9 text-primary-300" aria-hidden />
      <p className="font-bold text-primary-900">{title}</p>
      {children && <div className="text-muted">{children}</div>}
    </div>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 font-semibold text-danger">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function PrivacyNotice() {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-accent-200 bg-accent-50 px-4 py-3 text-[16px] font-semibold text-accent-800">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      이름, 전화번호, 주소 같은 개인정보는 쓰지 마세요.
    </p>
  );
}
