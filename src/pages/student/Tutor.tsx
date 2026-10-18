// 이 화면이 하는 일: AI 튜터와 문답. 튜터는 정답 대신 힌트와 되묻기로 생각을 이끌어 줍니다.
// 고치기 좋은 부분: 하루 질문 횟수는 appConfig.ai.tutorDailyLimit, 튜터 규칙은 src/prompts/tutorPrompt.ts

import { Bot, MessageCircleQuestion, Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BigButton } from '../../components/BigButton';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, InlineError, PageStatus, PrivacyNotice } from '../../components/Status';
import { appConfig } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { repo } from '../../repositories';
import { aiClient } from '../../services/aiClient';
import { useSession } from '../../store/sessionStore';
import type { TutorMessage, TutorRoom } from '../../types';
import { createId } from '../../utils/id';
import { todayKst } from '../../utils/kstDate';

const MAX_QUESTION = 500;

function ChatRoom({ room }: { room: TutorRoom }) {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const uid = user?.uid ?? '';
  const today = todayKst();

  const state = useAsync(async () => {
    const [messages, usage] = await Promise.all([repo.listTutorMessages(classId, { uid, roomId: room.id }), repo.getAiUsage(classId, uid, today)]);
    return { messages, usage };
  }, [classId, uid, room.id, today]);

  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [usage, setUsage] = useState(0);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.data) {
      setMessages(state.data.messages);
      setUsage(state.data.usage);
    }
  }, [state.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  if (!state.data) return <PageStatus {...state} onRetry={state.reload} />;

  const limit = appConfig.ai.tutorDailyLimit;
  const left = Math.max(0, limit - usage);

  async function send(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || thinking || left <= 0) return;
    setError(null);
    setThinking(true);
    const studentMsg: TutorMessage = { id: createId('m-'), classId, roomId: room.id, uid, role: 'student', text: question, createdAt: new Date().toISOString() };
    try {
      await repo.addTutorMessage(studentMsg);
      setMessages((prev) => [...prev, studentMsg]);
      setInput('');
      setUsage(await repo.incrementAiUsage(classId, uid, today));
      const history = messages.slice(-10).map((m) => ({ role: m.role, text: m.text }));
      const answer = await aiClient.askTutor({ room, history, message: question });
      const tutorMsg: TutorMessage = { id: createId('m-'), classId, roomId: room.id, uid, role: 'tutor', text: answer, createdAt: new Date().toISOString() };
      await repo.addTutorMessage(tutorMsg);
      setMessages((prev) => [...prev, tutorMsg]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex flex-col rounded-2xl bg-white shadow-card">
      <div className="border-b border-primary-100 px-5 py-4">
        <p className="font-extrabold text-primary-950">{room.topic}</p>
        <p className="text-[15px] text-muted">튜터 성격: {room.persona}</p>
      </div>
      <div className="max-h-[55vh] min-h-[280px] space-y-3 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 && (
          <p className="rounded-xl bg-primary-50 px-4 py-3 text-primary-900">
            안녕! 나는 "{room.topic}" 튜터야. 궁금한 걸 물어봐. 정답 대신 생각할 힌트를 줄게. 🌱
          </p>
        )}
        {messages.map((m) =>
          m.role === 'student' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary-900 px-4 py-2.5 text-white">{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className="flex items-end gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-100 text-accent-800">
                <Bot className="h-5 w-5" aria-hidden />
              </span>
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface px-4 py-2.5">{m.text}</p>
            </div>
          ),
        )}
        {thinking && (
          <div role="status" className="flex items-center gap-2 text-primary-700">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-100 text-accent-800">
              <Bot className="h-5 w-5 animate-pulse" aria-hidden />
            </span>
            <span className="font-semibold">튜터가 힌트를 고르고 있어요…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="space-y-2 border-t border-primary-100 p-4">
        <PrivacyNotice />
        <InlineError message={error} />
        <div className="flex gap-2">
          <label htmlFor="question" className="sr-only">
            질문
          </label>
          <input
            id="question"
            className="input flex-1"
            value={input}
            maxLength={MAX_QUESTION}
            onChange={(e) => setInput(e.target.value)}
            placeholder={left > 0 ? '궁금한 것을 물어보세요' : '오늘 질문을 모두 썼어요'}
            disabled={left <= 0}
          />
          <BigButton type="submit" icon={Send} disabled={!input.trim() || thinking || left <= 0} aria-label="보내기">
            <span className="hidden sm:inline">보내기</span>
          </BigButton>
        </div>
        <p className={`text-right text-[15px] font-semibold ${left <= 3 ? 'text-danger' : 'text-muted'}`}>
          오늘 남은 질문 {left}/{limit}번
        </p>
      </form>
    </div>
  );
}

export default function Tutor() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const [params, setParams] = useSearchParams();
  const state = useAsync(() => repo.listTutorRooms(classId), [classId]);

  const header = <PageHeader icon={MessageCircleQuestion} title="AI 영어 튜터" description="정답 대신 힌트로! 스스로 문장을 만드는 힘을 길러요." />;
  if (!state.data) {
    return (
      <div>
        {header}
        <PageStatus {...state} onRetry={state.reload} />
      </div>
    );
  }
  const rooms = state.data;
  if (rooms.length === 0) {
    return (
      <div>
        {header}
        <EmptyState title="아직 열린 튜터 방이 없어요" />
      </div>
    );
  }
  const room = rooms.find((r) => r.id === params.get('room')) ?? rooms[0];

  return (
    <div className="space-y-4">
      {header}
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="튜터 방 고르기">
        {rooms.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={r.id === room.id}
            onClick={() => setParams({ room: r.id })}
            className={`min-h-touch shrink-0 rounded-xl px-4 font-bold ${r.id === room.id ? 'bg-primary-900 text-white' : 'bg-white text-primary-800 shadow-card'}`}
          >
            {r.topic}
          </button>
        ))}
      </div>
      <ChatRoom key={room.id} room={room} />
    </div>
  );
}
