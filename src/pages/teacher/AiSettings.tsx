// 이 화면이 하는 일: 내 Gemini API 키를 넣고 확인하고, 샘플 AI ↔ Gemini 전환, 첨삭·튜터 모델을 고릅니다.
// 고치기 좋은 부분: 모델 목록은 src/config/aiModels.ts, 안내 문구(KEY_STEPS)

import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { Card } from '../../components/Card';
import { PageHeader } from '../../components/PageHeader';
import { InlineError } from '../../components/Status';
import { AI_MODELS, type AiModelId } from '../../config/aiModels';
import { errorMessage } from '../../hooks/useAsync';
import { geminiClient } from '../../services/aiClient';
import { useAiSettings } from '../../store/aiSettingsStore';

const KEY_STEPS = [
  'Google AI Studio(aistudio.google.com)에 Google 계정으로 로그인해요.',
  '왼쪽 메뉴의 "Get API key" → "API 키 만들기"를 눌러요.',
  '만들어진 키(AIza…로 시작)를 복사해서 아래 칸에 붙여 넣어요.',
];

function maskKey(key: string): string {
  return key.length <= 8 ? '••••' : `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

function ModelPicker({ label, value, onChange }: { label: string; value: AiModelId; onChange: (m: AiModelId) => void }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {AI_MODELS.map((m) => (
          <label key={m.id} className={`flex min-h-touch cursor-pointer gap-3 rounded-xl border-2 p-4 ${value === m.id ? 'border-primary-700 bg-primary-50' : 'border-primary-100'}`}>
            <input type="radio" name={label} className="mt-1 h-5 w-5 accent-primary-900" checked={value === m.id} onChange={() => onChange(m.id)} />
            <span>
              <span className="block font-bold">{m.label}</span>
              <span className="block font-mono text-[14px] text-primary-700">{m.id}</span>
              <span className="text-[15px] text-muted">{m.description}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function AiSettings() {
  const s = useAiSettings();
  const [draft, setDraft] = useState('');
  const [show, setShow] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function saveKey() {
    setError(null);
    setResult(null);
    const key = draft.trim();
    if (!/^[A-Za-z0-9_-]{20,200}$/.test(key)) {
      setError('API 키 모양이 올바르지 않아요. AIza…로 시작하는 키 전체를 붙여 넣어 주세요.');
      return;
    }
    s.setApiKey(key);
    setDraft('');
    setShow(false);
  }

  function removeKey() {
    if (!window.confirm('이 브라우저에 저장된 API 키를 지울까요?')) return;
    s.setApiKey('');
    s.setMode('mock');
    setResult(null);
  }

  async function check() {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const model = await geminiClient.checkKey();
      setResult(`키가 잘 동작해요! (${model})`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader icon={Bot} title="AI 설정" description="내 Gemini API 키를 넣으면 진짜 AI가 첨삭하고 대화해요." />

      <Card title="Gemini API 키" icon={KeyRound}>
        {s.apiKey ? (
          <div className="space-y-4">
            <p className="flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> 저장된 키: <span className="font-mono">{maskKey(s.apiKey)}</span>
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <BigButton full variant="outline" onClick={check} loading={checking}>
                키가 동작하는지 확인
              </BigButton>
              <BigButton full variant="danger" icon={Trash2} onClick={removeKey}>
                키 지우기
              </BigButton>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="space-y-2">
              {KEY_STEPS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-900 text-sm font-bold text-accent-300">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <label className="block">
              <span className="label">API 키 붙여 넣기</span>
              <div className="flex gap-2">
                <input
                  className="input flex-1 font-mono"
                  type={show ? 'text' : 'password'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="AIza..."
                  autoComplete="off"
                  spellCheck={false}
                />
                <button type="button" onClick={() => setShow(!show)} className="grid h-12 w-12 shrink-0 place-items-center self-center rounded-xl border border-primary-200" aria-label={show ? '키 숨기기' : '키 보기'}>
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </label>
            <BigButton full onClick={saveKey} disabled={!draft.trim()}>
              키 저장하기
            </BigButton>
          </div>
        )}
        <div className="mt-4 space-y-2">
          <InlineError message={error} />
          {result && (
            <p role="status" className="flex items-center gap-2 font-bold text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden /> {result}
            </p>
          )}
        </div>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-surface px-4 py-3 text-[15px] text-muted">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden />
          키는 이 브라우저에만 저장되고, AI를 부를 때 우리 앱 서버(Netlify Function)로만 전달돼요. 서버는 키를 저장하거나 기록하지 않아요. 여러 사람이
          쓰는 컴퓨터라면 수업이 끝난 뒤 [키 지우기]를 눌러 주세요.
        </p>
      </Card>

      <Card title="어떤 AI를 쓸까요?" icon={Bot}>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['mock', '샘플 AI', '인터넷·키 없이 연습용 답을 보여 줘요.'],
              ['gemini', 'Gemini (진짜 AI)', '내 API 키로 Gemini가 답해요.'],
            ] as const
          ).map(([value, label, desc]) => (
            <label key={value} className={`flex min-h-touch cursor-pointer gap-3 rounded-xl border-2 p-4 ${s.mode === value ? 'border-primary-700 bg-primary-50' : 'border-primary-100'}`}>
              <input type="radio" name="ai-mode" className="mt-1 h-5 w-5 accent-primary-900" checked={s.mode === value} onChange={() => s.setMode(value)} />
              <span>
                <span className="block font-bold">{label}</span>
                <span className="text-[15px] text-muted">{desc}</span>
              </span>
            </label>
          ))}
        </div>
        {s.mode === 'gemini' && !s.apiKey && <p className="mt-3 font-semibold text-accent-800">위에서 API 키를 먼저 넣어 주세요. (서버에 기본 키가 있으면 그 키를 써요.)</p>}
      </Card>

      <Card title="모델 고르기">
        <div className="space-y-5">
          <ModelPicker label="과제 첨삭에 쓸 모델" value={s.feedbackModel} onChange={s.setFeedbackModel} />
          <ModelPicker label="AI 튜터에 쓸 모델" value={s.tutorModel} onChange={s.setTutorModel} />
        </div>
      </Card>
    </div>
  );
}
