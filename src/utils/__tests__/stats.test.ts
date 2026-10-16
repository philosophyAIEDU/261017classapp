import { achievementRate, currentStreak, describeDays, earnedBadges, isRoutineDay, nextBadge, percent, routineStreak, scheduledDates } from '../stats';

const daily = { days: [], startDate: '2026-10-01', endDate: '2026-10-31' };
const weekdays = { days: [1, 2, 3, 4, 5], startDate: '2026-10-01', endDate: '2026-10-31' };

describe('stats', () => {
  it('루틴 하는 날을 판정한다', () => {
    expect(isRoutineDay(daily, '2026-10-10')).toBe(true);
    expect(isRoutineDay(daily, '2026-11-01')).toBe(false);
    expect(isRoutineDay(weekdays, '2026-10-17')).toBe(false); // 토요일
    expect(isRoutineDay(weekdays, '2026-10-16')).toBe(true);
  });

  it('달성률 = 해야 했던 날 중 인증한 날', () => {
    expect(scheduledDates(daily, '2026-10-04')).toHaveLength(4);
    expect(achievementRate(daily, ['2026-10-01', '2026-10-02'], '2026-10-04')).toBe(50);
    expect(achievementRate(daily, [], '2026-09-01')).toBe(0);
  });

  it('연속 인증일: 오늘 안 했어도 어제까지는 이어진다', () => {
    const logs = ['2026-10-13', '2026-10-14', '2026-10-15'];
    expect(currentStreak(logs, '2026-10-16')).toBe(3);
    expect(currentStreak([...logs, '2026-10-16'], '2026-10-16')).toBe(4);
    expect(currentStreak(logs, '2026-10-17')).toBe(0);
  });

  it('요일 루틴은 쉬는 날을 건너뛰고 센다', () => {
    // 금(16) - 토·일 쉼 - 월(19)
    expect(routineStreak(weekdays, ['2026-10-15', '2026-10-16', '2026-10-19'], '2026-10-19')).toBe(3);
    // 시작일 이전은 셈에서 멈춘다
    expect(routineStreak(daily, ['2026-10-01', '2026-10-02'], '2026-10-02')).toBe(2);
  });

  it('불꽃 배지 판정', () => {
    expect(earnedBadges(2)).toEqual([]);
    expect(earnedBadges(8)).toEqual([3, 7]);
    expect(earnedBadges(30)).toEqual([3, 7, 14, 30]);
    expect(nextBadge(8)).toEqual({ target: 14, remaining: 6 });
    expect(nextBadge(31)).toBeNull();
  });

  it('기타 도우미', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(1, 0)).toBe(0);
    expect(describeDays([])).toBe('매일');
    expect(describeDays([5, 1, 3])).toBe('매주 월·수·금');
  });
});
