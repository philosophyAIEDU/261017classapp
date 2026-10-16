// AI 피드백 카드: 칭찬 · 개선 제안 · 루브릭 단계 · 생각 넓히기 질문 · 교사 코멘트

import { Bot, HelpCircle, Lightbulb, MessageSquareQuote, Sparkles } from 'lucide-react';
import { terms } from '../config/appConfig';
import type { AiFeedback } from '../types';

interface FeedbackCardProps {
  feedback: AiFeedback;
  teacherComment?: string;
}

function LevelDots({ level }: { level: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`3단계 중 ${level}단계`}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={`h-3 w-6 rounded-full ${n <= level ? 'bg-accent-400' : 'bg-primary-100'}`} />
      ))}
    </span>
  );
}

export function FeedbackCard({ feedback, teacherComment }: FeedbackCardProps) {
  return (
    <article className="print-break overflow-hidden rounded-2xl bg-white shadow-card" aria-label="AI 피드백">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-primary-900 px-5 py-3 text-white">
        <p className="flex items-center gap-2 font-bold">
          <Bot className="h-5 w-5 text-accent-300" aria-hidden /> {terms.aiName}의 피드백
        </p>
        <span className="chip whitespace-nowrap bg-white/15 text-[14px] text-white">AI가 작성한 피드백입니다</span>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <section>
          <h3 className="mb-1.5 flex items-center gap-2 font-bold text-primary-900">
            <Sparkles className="h-5 w-5 text-accent-500" aria-hidden /> 잘한 점
          </h3>
          <p className="rounded-xl bg-accent-50 px-4 py-3 text-ink">{feedback.praise}</p>
        </section>

        <section>
          <h3 className="mb-1.5 flex items-center gap-2 font-bold text-primary-900">
            <Lightbulb className="h-5 w-5 text-accent-500" aria-hidden /> 이렇게 고쳐 보면 어떨까요?
          </h3>
          <ol className="space-y-2">
            {feedback.improvements.map((item, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-primary-100 px-4 py-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-900 text-sm font-bold text-white">{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </section>

        {feedback.rubric.length > 0 && (
          <section>
            <h3 className="mb-1.5 font-bold text-primary-900">루브릭 단계</h3>
            <ul className="divide-y divide-primary-100 rounded-xl border border-primary-100">
              {feedback.rubric.map((r) => (
                <li key={r.criterion} className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-primary-900">{r.criterion}</span>
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-primary-800">
                      <LevelDots level={r.level} /> {r.level}단계
                    </span>
                  </div>
                  <p className="mt-1 text-muted">{r.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl bg-primary-50 px-4 py-3">
          <h3 className="mb-1 flex items-center gap-2 font-bold text-primary-900">
            <HelpCircle className="h-5 w-5 text-primary-600" aria-hidden /> 생각을 넓히는 질문
          </h3>
          <p className="text-primary-950">{feedback.question}</p>
        </section>

        {teacherComment && (
          <section className="rounded-xl border-2 border-accent-300 px-4 py-3">
            <h3 className="mb-1 flex items-center gap-2 font-bold text-accent-800">
              <MessageSquareQuote className="h-5 w-5" aria-hidden /> {terms.teacher} 코멘트
            </h3>
            <p>{teacherComment}</p>
          </section>
        )}
      </div>
    </article>
  );
}
