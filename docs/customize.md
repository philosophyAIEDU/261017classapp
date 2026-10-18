# 내 수업에 맞게 바꾸기

코딩을 몰라도 괜찮아요. **따옴표(' ') 안의 글자, true/false, 숫자**만 바꾸면 됩니다.
쉼표(`,`), 중괄호(`{ }`), 대괄호(`[ ]`)는 지우지 마세요. 실수해도 GitHub에서 이전 버전으로 되돌릴 수 있어요.

> 💡 **AI와 함께 고치기**: 파일 내용을 통째로 복사해 Claude 같은 AI에게 붙여 넣고,
> "앱 이름을 ○○으로, 대상은 학원으로 바꿔 줘. 다른 부분은 그대로 두고 전체 파일을 다시 보여 줘"라고 부탁하세요.

---

## 1. `src/config/appConfig.ts` — ★ 가장 먼저 고칠 파일

### 앱 이름과 문구
```ts
appName: '우리반 AI 클래스',          // 화면 왼쪽 위와 브라우저 탭에 보이는 이름
organization: '필로소피 초등학교',     // 첫 화면과 QR 인쇄물에 보이는 기관 이름
slogan: 'AI 선생님과 함께 쓰고, 묻고, 꾸준히 자라요',
```

### 대상 모드 — 학교? 학원·강의?
```ts
mode: 'school' as TargetMode,   // 'school' 또는 'academy'
```
| `school` | `academy` |
| --- | --- |
| 우리 반 · 학생 · 선생님 · AI 선생님 | 강의실 · 수강생 · 강사님 · AI 코치 |

### 켜고 끌 기능
```ts
modules: {
  assignments: true,  // ① AI 첨삭 과제방 (끄면 포트폴리오도 함께 숨겨져요)
  routines: true,     // ② 학습 루틴 인증
  tutor: false,       // ③ AI 탐구 튜터 ← false 로 바꾸면 메뉴에서 사라져요
},
```

### 색상
`colors` 안의 `#` 색상 코드를 바꾸면 앱 전체 색이 바뀝니다.
- `primary` = 기본 색(지금은 네이비), `accent` = 포인트 색(지금은 골드)
- 숫자가 작을수록 연하고(50), 클수록 진해요(950). 전부 바꾸기 어렵다면 AI에게
  "`#2f6b4f`를 기준으로 50~950 단계 색을 만들어 줘"라고 부탁하세요.
- 글자가 잘 보이도록 진한 색(700~950)은 충분히 진하게 유지해 주세요.

### 숫자 설정
```ts
assignments: { maxRevisions: 2 },          // 고쳐 쓰기 최대 횟수 (첫 제출 제외)
routines: {
  maxTextLength: 300,                      // 루틴 인증 글 최대 글자 수
  maxPhotos: 2,                            // 인증 사진 최대 장수
  streakBadges: [3, 7, 14, 30],            // 🔥 불꽃 배지를 주는 연속 인증일
},
ai: {
  tutorDailyLimit: 20,                     // 학생 1명이 하루에 튜터에게 질문할 수 있는 횟수
  maxInputChars: 4000,                     // AI에게 보낼 수 있는 최대 글자 수
  defaultFeedbackTone: 'coach',            // 'coach' 다정한 코치 / 'editor' 꼼꼼한 편집자
  defaultTutorPersona: '친절하고 호기심 많은 탐구 선배',
},
```

---

## 2. `src/prompts/` — AI 지시문 모음

각 파일에는 두 종류의 표시가 있어요.
- ✏️ **선생님이 바꿔도 되는 부분** — 마음껏 고치세요.
- 🔒 **바꾸면 안 되는 안전 규칙** — 학생 보호와 앱 동작에 꼭 필요해요. 그대로 두세요.

| 파일 | 고칠 수 있는 것 |
| --- | --- |
| `rubricTemplates.ts` | 과제 만들 때 고르는 **루브릭 예시 4종** (독서록·논설문·영작·과학 탐구 보고서). 우리 과목 템플릿을 추가해도 돼요 |
| `feedbackPrompt.ts` | AI 피드백 **말투 설명** (`toneGuides`) |
| `tutorPrompt.ts` | 튜터 방 만들 때 고르는 **튜터 성격 예시** (`personaPresets`) |
| `parseFeedback.ts` | AI 응답이 이상할 때 대신 보여 줄 **기본 문구** (`FALLBACK_FEEDBACK`) |

### 루브릭 템플릿 추가 예시
`rubricTemplates` 목록 맨 끝 `];` 바로 위에 아래 덩어리를 붙여 넣고 내용만 바꾸세요.
```ts
  {
    id: 'poem',
    label: '시 쓰기',
    emoji: '🌸',
    suggestedTitle: '계절을 담은 시',
    suggestedPrompt: '요즘 계절에 본 장면을 떠올려 시를 써 보세요.',
    minChars: 50,
    maxChars: 400,
    rubric: [
      { name: '감각적 표현', levels: ['설명하듯 씀', '감각 표현이 있음', '여러 감각을 생생하게 씀'] },
      { name: '비유', levels: ['비유가 없음', '비유를 한 번 씀', '비유로 새로운 느낌을 줌'] },
    ],
  },
```
- 기준은 **2~5개**, 각 기준의 `levels`는 **반드시 3개**(1단계, 2단계, 3단계)여야 해요.

---

## 3. 그 밖의 파일

| 파일 | 내용 |
| --- | --- |
| `src/config/aiModels.ts` | 고를 수 있는 Gemini 모델 목록 |
| `src/repositories/sampleData.ts` | 데모용 학생 이름·샘플 글 (`STUDENT_NAMES`, `READING_TEXTS`, `ARGUMENT_TEXTS`) |
| `src/pages/…/*.tsx` | 각 화면. 파일 맨 위에 "이 화면이 하는 일 / 고치기 좋은 부분"이 적혀 있어요 |
| `.env` (`.env.example` 복사) | 데모 모드 켜기·끄기 등. 배포 주소에서는 Netlify 환경변수로 넣어요 |

## 고친 뒤 확인하기

- 내 컴퓨터: `npm run dev`를 켜 둔 채 저장하면 화면이 바로 바뀌어요.
- 배포한 앱: GitHub에 저장(Commit)하면 Netlify가 1~2분 뒤 자동으로 다시 배포해요.
  배포가 `Failed`라면 방금 고친 곳의 따옴표·쉼표를 확인하세요.
- 고친 내용이 다른 기능을 망가뜨리지 않았는지 확인하려면 `npm test`를 실행하세요.
