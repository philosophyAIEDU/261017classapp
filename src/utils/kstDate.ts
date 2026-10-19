// 모든 날짜 판정은 한국 시간(Asia/Seoul) 기준입니다.
// 해외 서버나 다른 시간대의 기기에서도 "오늘"이 똑같이 계산됩니다.

import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { KstDate } from '../types';

export const KST = 'Asia/Seoul';

/** 시각 → 한국 날짜 'yyyy-MM-dd' */
export function toKstDate(date: Date | string): KstDate {
  return formatInTimeZone(new Date(date), KST, 'yyyy-MM-dd');
}

/** 분 단위 열쇠 'yyyyMMddHHmm' (한국 시간) — 1분당 요청 수를 셀 때 사용 */
export function kstMinuteKey(now: Date = new Date()): string {
  return formatInTimeZone(now, KST, 'yyyyMMddHHmm');
}

/** 지금 한국 날짜 */
export function todayKst(now: Date = new Date()): KstDate {
  return toKstDate(now);
}

/** 'yyyy-MM-dd' 에 n일 더하기 (음수면 빼기) */
export function addDaysKst(date: KstDate, days: number): KstDate {
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** 요일 (0=일 ~ 6=토) */
export function dayOfWeekKst(date: KstDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** from ~ to 사이의 모든 날짜 (양 끝 포함) */
export function datesBetween(from: KstDate, to: KstDate): KstDate[] {
  const result: KstDate[] = [];
  let cur = from;
  while (cur <= to && result.length < 1000) {
    result.push(cur);
    cur = addDaysKst(cur, 1);
  }
  return result;
}

/** 한국 날짜의 하루 끝(23:59:59) 시각 → ISO. 마감일 저장에 사용 */
export function endOfKstDayIso(date: KstDate): string {
  return fromZonedTime(`${date}T23:59:59`, KST).toISOString();
}

/** 화면 표시용: '10월 16일 (금)' */
export function formatKstShort(date: Date | string): string {
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const kst = toKstDate(date);
  const [, m, d] = kst.split('-').map(Number);
  return `${m}월 ${d}일 (${dayNames[dayOfWeekKst(kst)]})`;
}

/** 화면 표시용: '10월 16일 14:05' */
export function formatKstDateTime(date: Date | string): string {
  return formatInTimeZone(new Date(date), KST, 'M월 d일 HH:mm');
}

/** 날짜 문자열 'yyyy-MM-dd' → '10/16' */
export function formatMonthDay(date: KstDate): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}
