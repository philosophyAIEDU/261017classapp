// 루틴 달성률, 연속 인증일(🔥), 불꽃 배지를 계산합니다.

import { appConfig } from '../config/appConfig';
import type { KstDate, Routine } from '../types';
import { addDaysKst, datesBetween, dayOfWeekKst } from './kstDate';

/** 이 날짜가 루틴을 해야 하는 날인지 */
export function isRoutineDay(routine: Pick<Routine, 'days' | 'startDate' | 'endDate'>, date: KstDate): boolean {
  if (date < routine.startDate || date > routine.endDate) return false;
  if (routine.days.length === 0) return true; // 매일
  return routine.days.includes(dayOfWeekKst(date));
}

/** 시작일부터 today 까지 해야 했던 날짜 목록 */
export function scheduledDates(routine: Pick<Routine, 'days' | 'startDate' | 'endDate'>, today: KstDate): KstDate[] {
  const last = today < routine.endDate ? today : routine.endDate;
  if (last < routine.startDate) return [];
  return datesBetween(routine.startDate, last).filter((d) => isRoutineDay(routine, d));
}

/** 달성률 (0~100 정수). 해야 했던 날 중 인증한 날의 비율 */
export function achievementRate(
  routine: Pick<Routine, 'days' | 'startDate' | 'endDate'>,
  loggedDates: KstDate[],
  today: KstDate,
): number {
  const scheduled = scheduledDates(routine, today);
  if (scheduled.length === 0) return 0;
  const logged = new Set(loggedDates);
  const done = scheduled.filter((d) => logged.has(d)).length;
  return Math.round((done / scheduled.length) * 100);
}

/**
 * 연속 인증일.
 * - isScheduled 를 주면 "해야 하는 날"만 세고, 쉬는 날은 건너뜁니다.
 * - 오늘 아직 인증하지 않았다면 어제까지의 기록으로 셉니다(오늘 하루가 끝나기 전엔 끊기지 않음).
 */
export function currentStreak(
  loggedDates: KstDate[],
  today: KstDate,
  isScheduled: (date: KstDate) => boolean = () => true,
): number {
  const logged = new Set(loggedDates);
  let cursor = today;
  if (!logged.has(cursor)) cursor = addDaysKst(cursor, -1);

  let streak = 0;
  // 최대 1년까지만 거슬러 올라갑니다.
  for (let i = 0; i < 366; i += 1) {
    if (logged.has(cursor)) {
      streak += 1;
    } else if (isScheduled(cursor)) {
      break;
    }
    cursor = addDaysKst(cursor, -1);
  }
  return streak;
}

/** 루틴 하나의 연속 인증일 */
export function routineStreak(routine: Pick<Routine, 'days' | 'startDate' | 'endDate'>, loggedDates: KstDate[], today: KstDate): number {
  return currentStreak(loggedDates, today, (d) => {
    if (d < routine.startDate) return true; // 시작 전이면 거기서 멈춤
    return isRoutineDay(routine, d);
  });
}

/** 받은 불꽃 배지 (예: 연속 8일 → [3, 7]) */
export function earnedBadges(streak: number, thresholds: number[] = appConfig.routines.streakBadges): number[] {
  return thresholds.filter((t) => streak >= t);
}

/** 다음 배지까지 남은 날 (모두 받았으면 null) */
export function nextBadge(streak: number, thresholds: number[] = appConfig.routines.streakBadges): { target: number; remaining: number } | null {
  const next = thresholds.find((t) => streak < t);
  return next === undefined ? null : { target: next, remaining: next - streak };
}

/** 백분율 (분모 0이면 0) */
export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

/** [1,3,5] → '매주 월·수·금', [] → '매일' */
export function describeDays(days: number[]): string {
  if (days.length === 0) return '매일';
  return `매주 ${[...days].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join('·')}`;
}
