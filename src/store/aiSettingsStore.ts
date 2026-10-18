// AI 설정(샘플 AI / Gemini, API 키, 모델)을 기억하는 곳입니다. 교사 "AI 설정" 화면에서 바꿉니다.
// ⚠️ API 키는 이 브라우저(localStorage)에만 저장됩니다. 함께 쓰는 컴퓨터라면 수업 뒤에 [키 지우기]를 눌러 주세요.

import { create } from 'zustand';
import { DEFAULT_FEEDBACK_MODEL, DEFAULT_TUTOR_MODEL, isAllowedModel, type AiModelId } from '../config/aiModels';
import { env, type AiMode } from '../config/env';

const STORAGE_KEY = 'classapp:ai-settings';

interface StoredSettings {
  mode: AiMode;
  apiKey: string;
  feedbackModel: AiModelId;
  tutorModel: AiModelId;
}

interface AiSettingsState extends StoredSettings {
  setMode: (mode: AiMode) => void;
  setApiKey: (key: string) => void;
  setFeedbackModel: (model: AiModelId) => void;
  setTutorModel: (model: AiModelId) => void;
}

function load(): StoredSettings {
  const defaults: StoredSettings = { mode: env.aiMode, apiKey: '', feedbackModel: DEFAULT_FEEDBACK_MODEL, tutorModel: DEFAULT_TUTOR_MODEL };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const saved = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      mode: saved.mode === 'gemini' || saved.mode === 'mock' ? saved.mode : defaults.mode,
      apiKey: typeof saved.apiKey === 'string' ? saved.apiKey : '',
      feedbackModel: isAllowedModel(saved.feedbackModel) ? saved.feedbackModel : defaults.feedbackModel,
      tutorModel: isAllowedModel(saved.tutorModel) ? saved.tutorModel : defaults.tutorModel,
    };
  } catch {
    return defaults;
  }
}

function save(state: StoredSettings): void {
  try {
    const { mode, apiKey, feedbackModel, tutorModel } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, apiKey, feedbackModel, tutorModel }));
  } catch {
    // 저장이 막힌 브라우저(시크릿 창 등)에서도 이번 화면에서는 동작합니다.
  }
}

export const useAiSettings = create<AiSettingsState>((set, get) => {
  const update = (patch: Partial<StoredSettings>) => {
    set(patch);
    save(get());
  };
  return {
    ...load(),
    setMode: (mode) => update({ mode }),
    setApiKey: (apiKey) => update({ apiKey: apiKey.trim() }),
    setFeedbackModel: (feedbackModel) => update({ feedbackModel }),
    setTutorModel: (tutorModel) => update({ tutorModel }),
  };
});

/** 화면 아래 배지 문구 */
export function useModeLabel(): string {
  const mode = useAiSettings((s) => s.mode);
  return `${env.dataMode === 'local' ? '로컬 저장' : 'Firebase 저장'} · ${mode === 'mock' ? '샘플 AI' : 'Gemini AI'}`;
}
