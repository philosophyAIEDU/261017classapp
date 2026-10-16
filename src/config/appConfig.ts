// ★★★ 수강생이 가장 먼저 고칠 파일입니다 ★★★
// 앱 이름, 기관 이름, 대상 모드, 켜고 끌 기능, 색상, AI 기본값이 모두 여기 모여 있습니다.
// 따옴표(' ') 안의 글자만 바꾸면 됩니다. 쉼표(,)와 중괄호({ })는 지우지 마세요.

export type TargetMode = 'school' | 'academy';

export const appConfig = {
  // ── 1. 기본 정보 ─────────────────────────────
  appName: '우리반 AI 클래스',
  organization: '필로소피 초등학교',
  slogan: 'AI 선생님과 함께 쓰고, 묻고, 꾸준히 자라요',

  // ── 2. 대상 모드 ─────────────────────────────
  // 'school'  → 우리 반 · 학생 · 선생님
  // 'academy' → 강의실 · 수강생 · 강사님
  mode: 'school' as TargetMode,

  // ── 3. 켜고 끌 기능 (true = 켜기, false = 끄기) ──
  modules: {
    assignments: true, // ① AI 첨삭 과제방
    routines: true, // ② 학습 루틴 인증
    tutor: true, // ③ AI 탐구 튜터
  },

  // ── 4. 색상 (#으로 시작하는 색상 코드) ──────────
  // primary = 신뢰감 있는 네이비, accent = 골드 포인트
  colors: {
    primary: {
      50: '#f2f5fa',
      100: '#e1e8f3',
      200: '#c3d0e6',
      300: '#94abd0',
      400: '#5f7fb3',
      500: '#3d5f97',
      600: '#2c4a7d',
      700: '#213a66',
      800: '#1a2f55',
      900: '#14284b',
      950: '#0c1a33',
    },
    accent: {
      50: '#fdf8ec',
      100: '#faefcf',
      200: '#f4dd9c',
      300: '#edc867',
      400: '#e0b24a',
      500: '#c99a2e',
      600: '#a87b20',
      700: '#7f5c17',
      800: '#5e4413',
    },
  },

  // ── 5. 과제방 설정 ─────────────────────────────
  assignments: {
    maxRevisions: 2, // 고쳐 쓰기 최대 횟수 (첫 제출 제외)
  },

  // ── 6. 루틴 설정 ─────────────────────────────
  routines: {
    maxTextLength: 300, // 인증 글 최대 글자 수
    maxPhotos: 2, // 인증 사진 최대 장수
    streakBadges: [3, 7, 14, 30], // 🔥 불꽃 배지를 주는 연속 인증일
  },

  // ── 7. AI 기본값 ─────────────────────────────
  ai: {
    tutorDailyLimit: 20, // 학생 1명이 하루에 튜터에게 질문할 수 있는 횟수
    maxInputChars: 4000, // AI에게 보낼 수 있는 최대 글자 수
    defaultFeedbackTone: 'coach' as 'coach' | 'editor', // coach = 다정한 코치, editor = 꼼꼼한 편집자
    defaultTutorPersona: '친절하고 호기심 많은 탐구 선배',
  },
};

// ── 모드별 호칭 (보통은 고치지 않아도 됩니다) ─────────
const termsByMode = {
  school: {
    room: '우리 반',
    group: '학급',
    student: '학생',
    teacher: '선생님',
    aiName: 'AI 선생님',
  },
  academy: {
    room: '강의실',
    group: '강의',
    student: '수강생',
    teacher: '강사님',
    aiName: 'AI 코치',
  },
};

export const terms = termsByMode[appConfig.mode];
