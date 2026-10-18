// 이 화면이 하는 일: 튜터 방 만들기(주제·성격·추가 지시문), 학생별 질문 기록 열람, 자주 나온 질문 키워드.
// 고치기 좋은 부분: 성격 예시는 src/prompts/tutorPrompt.ts 의 personaPresets

import { Lock, MessageCircleQuestion, Plus, Trash2, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState, InlineError, PageStatus } from '../../components/Status';
import { appConfig, terms } from '../../config/appConfig';
import { errorMessage, useAsync } from '../../hooks/useAsync';
import { personaPresets, TUTOR_SAFETY_RULES } from '../../prompts/tutorPrompt';
import { repo } from '../../repositories';
import { useSession } from '../../store/sessionStore';
import type { TutorRoom } from '../../types';
import { createId } from '../../utils/id';
import { topKeywords } from '../../utils/keywords';
import { formatKstDateTime } from '../../utils/kstDate';

function TutorForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const user = useSession((s) => s.user);
  const [topic, setTopic] = useState('');
  const [persona, setPersona] = useState(appConfig.ai.defaultTutorPersona);
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user?.classId) return;
    setBusy(true);
    setError(null);
    try {
      await repo.saveTutorRoom({ id: createId('t-'), classId: user.classId, topic: topic.trim(), persona: persona.trim(), teacherInstruction: instruction.trim(), createdAt: new Date().toISOString() });
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="새 튜터 방" action={<button type="button" onClick={onCancel} className="grid h-12 w-12 place-items-center rounded-xl hover:bg-primary-50" aria-label="닫기"><X className="h-5 w-5" /></button>}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="label">주제</span>
          <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 현재완료 (Present Perfect)" required maxLength={40} />
        </label>
        <div>
          <span className="label">튜터 성격</span>
          <div className="mb-2 flex flex-wrap gap-2">
            {personaPresets.map((p) => (
              <button key={p} type="button" aria-pressed={persona === p} onClick={() => setPersona(p)} className={`chip min-h-touch px-4 text-[15px] ${persona === p ? 'bg-primary-900 text-white' : 'bg-surface text-primary-800'}`}>
                {p}
              </button>
            ))}
          </div>
          <input className="input" value={persona} onChange={(e) => setPersona(e.target.value)} aria-label="튜터 성격 직접 쓰기" required />
        </div>
        <label className="block">
          <span className="label">{terms.teacher} 추가 지시문 (선택)</span>
          <textarea className="input min-h-[100px]" value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="예: 교재 Unit 3 범위에서만 다뤄 주세요. 예문은 쉬운 단어로." maxLength={600} />
        </label>
        <details className="rounded-xl bg-surface px-4">
          <summary className="flex min-h-touch cursor-pointer items-center gap-2 font-bold text-primary-800">
            <Lock className="h-4 w-4" aria-hidden /> 항상 켜져 있는 안전 규칙 보기
          </summary>
          <pre className="whitespace-pre-wrap pb-4 font-sans text-[15px] text-muted">{TUTOR_SAFETY_RULES}</pre>
        </details>
        <InlineError message={error} />
        <BigButton full type="submit" loading={busy}>
          튜터 방 열기
        </BigButton>
      </form>
    </Card>
  );
}

export default function ManageTutors() {
  const user = useSession((s) => s.user);
  const classId = user?.classId ?? '';
  const [creating, setCreating] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [studentUid, setStudentUid] = useState<string | null>(null);

  const state = useAsync(async () => {
    const [rooms, messages, members] = await Promise.all([repo.listTutorRooms(classId), repo.listTutorMessages(classId), repo.listMembers(classId)]);
    return { rooms, messages, students: members.filter((m) => m.role === 'student') };
  }, [classId]);

  async function remove(room: TutorRoom) {
    if (!window.confirm(`"${room.topic}" 튜터 방과 대화 기록을 모두 지울까요?`)) return;
    await repo.deleteTutorRoom(classId, room.id);
    setRoomId(null);
    state.reload();
  }

  const header = (
    <PageHeader icon={MessageCircleQuestion} title="튜터 관리" description="정답 대신 힌트를 주는 AI 튜터 방을 열어요." action={!creating && <BigButton icon={Plus} variant="accent" onClick={() => setCreating(true)}>새 튜터 방</BigButton>} />
  );
  if (!state.data) {
    return (
      <div>
        {header}
        <PageStatus {...state} onRetry={state.reload} />
      </div>
    );
  }
  const { rooms, messages, students } = state.data;
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const roomMessages = room ? messages.filter((m) => m.roomId === room.id) : [];
  const questions = roomMessages.filter((m) => m.role === 'student');
  const keywords = topKeywords(questions.map((q) => q.text));
  const askers = students.filter((s) => questions.some((q) => q.uid === s.uid));
  const viewing = askers.find((s) => s.uid === studentUid) ?? askers[0];
  const conversation = viewing ? roomMessages.filter((m) => m.uid === viewing.uid) : [];

  return (
    <div className="space-y-5">
      {header}
      {creating && (
        <TutorForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            state.reload();
          }}
        />
      )}
      {!room ? (
        <EmptyState title="아직 튜터 방이 없어요" />
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
            {rooms.map((r) => (
              <button key={r.id} type="button" role="tab" aria-selected={r.id === room.id} onClick={() => { setRoomId(r.id); setStudentUid(null); }} className={`min-h-touch shrink-0 rounded-xl px-4 font-bold ${r.id === room.id ? 'bg-primary-900 text-white' : 'bg-white text-primary-800 shadow-card'}`}>
                {r.topic}
              </button>
            ))}
          </div>
          <Card
            title={room.topic}
            action={
              <button type="button" onClick={() => remove(room)} className="flex min-h-touch items-center gap-1 rounded-xl px-3 font-semibold text-danger hover:bg-red-50">
                <Trash2 className="h-5 w-5" aria-hidden /> 삭제
              </button>
            }
          >
            <p className="text-muted">성격: {room.persona}</p>
            {room.teacherInstruction && <p className="mt-1 text-muted">추가 지시: {room.teacherInstruction}</p>}
            <div className="mt-4">
              <p className="label">자주 나온 질문 키워드 (질문 {questions.length}개)</p>
              {keywords.length === 0 ? (
                <p className="text-muted">아직 질문이 없어요.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {keywords.map((k) => (
                    <li key={k.word} className="chip bg-accent-100 text-accent-800">
                      #{k.word} <span className="text-primary-700">{k.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          {askers.length > 0 && viewing && (
            <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
              <ul className="space-y-1.5 rounded-2xl bg-white p-3 shadow-card" aria-label={`질문한 ${terms.student}`}>
                {askers.map((s) => (
                  <li key={s.uid}>
                    <button type="button" onClick={() => setStudentUid(s.uid)} className={`flex min-h-touch w-full items-center justify-between rounded-xl px-3 font-semibold ${viewing.uid === s.uid ? 'bg-primary-900 text-white' : 'hover:bg-surface'}`}>
                      {s.studentNo}. {s.name}
                      <span className="text-[14px]">{questions.filter((q) => q.uid === s.uid).length}개</span>
                    </button>
                  </li>
                ))}
              </ul>
              <Card title={`${viewing.name}의 대화`}>
                <ul className="space-y-3">
                  {conversation.map((m) => (
                    <li key={m.id} className={m.role === 'student' ? 'text-right' : ''}>
                      <p className={`inline-block max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-left ${m.role === 'student' ? 'bg-primary-900 text-white' : 'bg-surface'}`}>{m.text}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{formatKstDateTime(m.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
