// ★★★ 수강생이 가장 먼저 고칠 파일입니다 ★★★
// 앱 이름, 기관 이름, 대상 모드, 켜고 끌 기능, 색상, AI 기본값이 모두 여기 모여 있습니다.
// 따옴표(' ') 안의 글자만 바꾸면 됩니다. 쉼표(,)와 중괄호({ })는 지우지 마세요.

export type TargetMode = 'school' | 'academy';

export const appConfig = {
  // ── 1. 기본 정보 ─────────────────────────────
  appName: 'AI 영어 클래스',
  organization: '레인보우 어학원',
  slogan: 'AI 코치와 함께 쓰고, 말하고, 매일 조금씩 늘어요',
  // 첫 화면 큰 제목 (두 번째 줄 앞부분은 라벤더색으로 강조돼요)
  heroTitle: ['영어로 쓰고 묻는', '나만의 AI 클래스', '에 오신 걸 환영해요'] as [string, string, string],

  // ── 2. 대상 모드 ─────────────────────────────
  // 'school'  → 우리 반 · 학생 · 선생님
  // 'academy' → 우리 클래스 · 수강생 · 강사님
  mode: 'academy' as TargetMode,

  // ── 3. 켜고 끌 기능 (true = 켜기, false = 끄기) ──
  modules: {
    assignments: true, // ① AI 첨삭 과제방 (영작 첨삭)
    routines: true, // ② 학습 루틴 인증 (단어·듣기·쉐도잉)
    tutor: true, // ③ AI 튜터 (문법·표현 질문)
  },

  // ── 4. 색상 (#으로 시작하는 색상 코드) ──────────
  // primary = 부드러운 라벤더, accent = 따뜻한 피치 포인트
  colors: {
    primary: {
      50: '#f7f4fc',
      100: '#eee7f7',
      200: '#dfd2ee',
      300: '#c8b5e1',
      400: '#ae91cb',
      500: '#9574b6',
      600: '#7d5b9d',
      700: '#694982',
      800: '#593d6c',
      900: '#493555',
      950: '#382940',
    },
    accent: {
      50: '#fff8f1',
      100: '#ffeddf',
      200: '#ffdcc4',
      300: '#f8c5a5',
      400: '#f1b38f',
      500: '#ce815b',
      600: '#ad6240',
      700: '#8b4c32',
      800: '#713d2c',
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
    tutorDailyLimit: 15, // 학생 1명이 하루에 튜터에게 질문할 수 있는 횟수
    dailyAiLimit: 20, // (Firebase 모드) 수강생 1명이 하루에 AI(첨삭+튜터)를 부를 수 있는 전체 횟수 — 서버가 지켜요
    maxInputChars: 4000, // AI에게 보낼 수 있는 최대 글자 수
    defaultFeedbackTone: 'coach' as 'coach' | 'editor', // coach = 다정한 코치, editor = 꼼꼼한 편집자
    defaultTutorPersona: '친절하고 차분한 영어 코치',

    // 🆓 Gemini 무료 티어 지키기 — 우리 앱 전체(클래스 단위)가 아래 횟수를 넘으면 서버가 AI를 부르지 않아요.
    // Google AI Studio → 대시보드 → 사용량·비율 제한(Rate limits)에서 내 키의 무료 한도를 확인하고,
    // 그보다 조금 낮게 적어 두세요. (모델마다, 시기마다 무료 한도가 달라요)
    freeTier: {
      requestsPerMinute: 8, // 1분에 최대 몇 번 (무료 한도 RPM보다 낮게)
      requestsPerDay: 200, // 하루(한국 시간 자정 기준)에 최대 몇 번 (무료 한도 RPD보다 낮게)
      maxOutputTokens: { feedback: 1200, tutor: 400 }, // AI 답 길이 상한 (토큰 = 글자 조각)
    },
  },
};

// ── 모드별 호칭 (보통은 고치지 않아도 됩니다) ─────────
const termsByMode = {
  school: {
    room: '우리 반',
    group: '학급', // '학급 코드', '학급 만들기' 처럼 쓰여요
    student: '학생',
    teacher: '선생님',
    aiName: 'AI 선생님',
  },
  academy: {
    room: '우리 클래스',
    group: '클래스',
    student: '수강생',
    teacher: '강사님',
    aiName: 'AI 코치',
  },
};

export const terms = { ...termsByMode[appConfig.mode], code: `${termsByMode[appConfig.mode].group} 코드` };
