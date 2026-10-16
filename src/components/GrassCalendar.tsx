// 잔디 달력: 최근 몇 주 동안 인증한 날을 초록 칸으로 보여 줍니다.

import type { KstDate } from '../types';
import { addDaysKst, dayOfWeekKst, formatMonthDay } from '../utils/kstDate';

interface GrassCalendarProps {
  today: KstDate;
  loggedDates: KstDate[];
  isScheduled: (date: KstDate) => boolean;
  weeks?: number;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function GrassCalendar({ today, loggedDates, isScheduled, weeks = 5 }: GrassCalendarProps) {
  const logged = new Set(loggedDates);
  // 이번 주 토요일까지 채우고, weeks 주 전 일요일부터 시작
  const end = addDaysKst(today, 6 - dayOfWeekKst(today));
  const start = addDaysKst(end, -(weeks * 7 - 1));
  const columns: KstDate[][] = [];
  for (let w = 0; w < weeks; w += 1) {
    columns.push(Array.from({ length: 7 }, (_, d) => addDaysKst(start, w * 7 + d)));
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <div className="grid grid-rows-7 gap-1.5 pr-1 text-[13px] font-semibold text-muted">
          {DAY_LABELS.map((l) => (
            <span key={l} className="flex h-7 items-center">
              {l}
            </span>
          ))}
        </div>
        {columns.map((col) => (
          <div key={col[0]} className="grid grid-rows-7 gap-1.5">
            {col.map((date) => {
              const done = logged.has(date);
              const future = date > today;
              const scheduled = isScheduled(date);
              let cls = 'bg-primary-50';
              if (done) cls = 'bg-success';
              else if (future) cls = 'bg-transparent border border-dashed border-primary-100';
              else if (scheduled) cls = 'bg-primary-100';
              return (
                <span
                  key={date}
                  title={`${formatMonthDay(date)} ${done ? '인증 완료' : scheduled && !future ? '미인증' : ''}`}
                  aria-label={`${formatMonthDay(date)} ${done ? '인증 완료' : '인증 없음'}`}
                  className={`h-7 w-7 rounded-md ${cls} ${date === today ? 'ring-2 ring-accent-400 ring-offset-1' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[14px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-success" /> 인증
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-primary-100" /> 못 한 날
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-primary-50" /> 쉬는 날
        </span>
      </div>
    </div>
  );
}
