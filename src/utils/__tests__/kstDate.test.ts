import { addDaysKst, datesBetween, dayOfWeekKst, endOfKstDayIso, formatMonthDay, todayKst, toKstDate } from '../kstDate';

describe('kstDate', () => {
  it('KST 23:59 는 그날, 00:00 은 다음 날로 판정한다', () => {
    // 2026-10-16 23:59 KST = 2026-10-16 14:59 UTC
    expect(todayKst(new Date('2026-10-16T14:59:00Z'))).toBe('2026-10-16');
    // 2026-10-17 00:00 KST = 2026-10-16 15:00 UTC
    expect(todayKst(new Date('2026-10-16T15:00:00Z'))).toBe('2026-10-17');
  });

  it('ISO 문자열도 KST 날짜로 바꾼다', () => {
    expect(toKstDate('2026-12-31T15:30:00Z')).toBe('2027-01-01');
  });

  it('날짜 더하기는 월·연도 경계를 넘는다', () => {
    expect(addDaysKst('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysKst('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('요일과 기간을 계산한다', () => {
    expect(dayOfWeekKst('2026-10-16')).toBe(5); // 금요일
    expect(datesBetween('2026-10-14', '2026-10-16')).toEqual(['2026-10-14', '2026-10-15', '2026-10-16']);
    expect(datesBetween('2026-10-16', '2026-10-14')).toEqual([]);
    expect(formatMonthDay('2026-10-06')).toBe('10/6');
  });

  it('마감 시각은 KST 23:59:59', () => {
    expect(endOfKstDayIso('2026-10-16')).toBe('2026-10-16T14:59:59.000Z');
  });
});
