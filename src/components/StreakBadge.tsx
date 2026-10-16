// 연속 인증일 🔥 불꽃 배지 (3일 · 7일 · 14일 · 30일)

import { appConfig } from '../config/appConfig';
import { nextBadge } from '../utils/stats';

export function StreakBadge({ streak, compact }: { streak: number; compact?: boolean }) {
  const next = nextBadge(streak);
  return (
    <div className={compact ? '' : 'rounded-2xl bg-gradient-to-br from-primary-900 to-primary-700 p-5 text-white'}>
      {!compact && (
        <div className="flex items-end gap-2">
          <span className="text-4xl" aria-hidden>
            🔥
          </span>
          <p className="text-[34px] font-extrabold leading-none">{streak}</p>
          <p className="pb-1 font-semibold text-primary-100">일 연속 인증</p>
        </div>
      )}
      <ul className={`flex flex-wrap gap-2 ${compact ? '' : 'mt-4'}`} aria-label="불꽃 배지">
        {appConfig.routines.streakBadges.map((days) => {
          const earned = streak >= days;
          return (
            <li
              key={days}
              className={`chip ${
                earned
                  ? 'bg-accent-400 text-primary-950'
                  : compact
                    ? 'bg-primary-50 text-primary-400'
                    : 'bg-white/10 text-primary-100'
              }`}
            >
              <span aria-hidden>{earned ? '🔥' : '·'}</span> {days}일{earned ? '' : ' (아직)'}
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="mt-3 text-[15px] text-primary-100">
          {next ? `${next.remaining}일만 더 하면 ${next.target}일 배지를 받아요!` : '모든 배지를 모았어요. 정말 대단해요!'}
        </p>
      )}
    </div>
  );
}
