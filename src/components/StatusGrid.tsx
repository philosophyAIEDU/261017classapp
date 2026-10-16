// 학생 × 날짜 현황표 (✅ 인증 / ⬜ 미인증 / · 쉬는 날)

import type { KstDate, Member } from '../types';
import { formatMonthDay } from '../utils/kstDate';

interface StatusGridProps {
  students: Member[];
  dates: KstDate[];
  isDone: (uid: string, date: KstDate) => boolean;
  isScheduled: (date: KstDate) => boolean;
  today: KstDate;
}

export function StatusGrid({ students, dates, isDone, isScheduled, today }: StatusGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-primary-100">
      <table className="w-full border-collapse text-center text-[15px]">
        <thead className="bg-primary-50">
          <tr>
            <th className="sticky left-0 bg-primary-50 px-3 py-2 text-left font-bold text-primary-900">이름</th>
            {dates.map((d) => (
              <th key={d} className={`px-1.5 py-2 font-semibold ${d === today ? 'text-accent-700' : 'text-primary-800'}`}>
                {formatMonthDay(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.uid} className="border-t border-primary-100">
              <th scope="row" className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 text-left font-semibold">
                {s.studentNo}. {s.name}
              </th>
              {dates.map((d) => {
                const scheduled = isScheduled(d);
                const done = isDone(s.uid, d);
                return (
                  <td key={d} className={`px-1.5 py-2 ${d === today ? 'bg-accent-50' : ''}`}>
                    {done ? <span aria-label="인증">✅</span> : scheduled ? <span aria-label="미인증">⬜</span> : <span className="text-primary-200" aria-label="쉬는 날">·</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
