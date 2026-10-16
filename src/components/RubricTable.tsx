// 루브릭 표. results 를 주면 AI/교사가 고른 단계를 골드색으로 강조합니다.

import type { RubricCriterion, RubricResult } from '../types';

interface RubricTableProps {
  rubric: RubricCriterion[];
  results?: RubricResult[];
}

export function RubricTable({ rubric, results }: RubricTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-primary-100">
      <table className="w-full min-w-[520px] border-collapse text-left text-[16px]">
        <thead className="bg-primary-50 text-primary-900">
          <tr>
            <th className="px-3 py-2.5 font-bold">기준</th>
            <th className="px-3 py-2.5 font-bold">1단계</th>
            <th className="px-3 py-2.5 font-bold">2단계</th>
            <th className="px-3 py-2.5 font-bold">3단계</th>
          </tr>
        </thead>
        <tbody>
          {rubric.map((c) => {
            const picked = results?.find((r) => r.criterion === c.name)?.level;
            return (
              <tr key={c.name} className="border-t border-primary-100 align-top">
                <th scope="row" className="px-3 py-2.5 font-bold text-primary-900">
                  {c.name}
                </th>
                {c.levels.map((desc, i) => {
                  const active = picked === i + 1;
                  return (
                    <td key={i} className={`px-3 py-2.5 ${active ? 'bg-accent-100 font-bold text-primary-950' : 'text-muted'}`}>
                      {active && <span className="sr-only">선택됨: </span>}
                      {desc}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
