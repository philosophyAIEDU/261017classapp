# Netlify로 배포하기 (인터넷 주소 만들기)

내 앱을 `https://우리반.netlify.app` 같은 인터넷 주소로 만들어, 교실 화면·휴대폰·태블릿 어디서나 열 수 있게 해 봅시다.
순서는 **① GitHub에 내 저장소 만들기 → ② Netlify에 연결하기 → ③ 확인하기**입니다. 처음이면 20~30분쯤 걸려요.

> ⚠️ **Netlify Drop(폴더를 끌어다 놓는 배포)은 쓰지 마세요.**
> 화면은 올라가지만 AI 서버(Netlify Functions)가 올라가지 않아서 **AI 첨삭·튜터가 꺼집니다.**
> 반드시 아래처럼 **GitHub 저장소를 연결**해서 배포하세요.

---

## ① GitHub에 내 저장소 만들기

GitHub는 코드를 보관하는 인터넷 서랍이에요. **https://github.com** 에서 무료로 가입합니다.

### 방법 A. 강사가 준 저장소에서 복사하기 (가장 쉬움, 추천)

1. 강사가 알려 준 저장소 주소를 엽니다.
2. 오른쪽 위 초록색 **Use this template** → **Create a new repository**를 누릅니다.
   - 이 버튼이 안 보이면 오른쪽 위 **Fork** 버튼을 눌러도 됩니다.
3. **Repository name**에 영어로 이름을 씁니다. 예: `my-classapp`
4. **Private**(나만 보기)를 고르고 **Create repository**를 누릅니다.

### 방법 B. 내 컴퓨터에 있는 폴더를 올리기

GitHub 웹사이트의 파일 올리기는 한 번에 100개까지만 돼서, 이 앱은 **GitHub Desktop** 프로그램으로 올리는 것이 편해요.

1. **https://desktop.github.com** 에서 GitHub Desktop을 설치하고 GitHub 계정으로 로그인합니다.
2. 메뉴 **File → Add local repository**를 누르고, 앱 폴더를 고릅니다.
   - "이 폴더는 Git 저장소가 아니에요"라고 나오면 **create a repository**를 누릅니다.
3. 오른쪽 위 **Publish repository**를 누르고, **Keep this code private**에 체크한 뒤 **Publish**를 누릅니다.

> `node_modules`, `dist`, `.env` 폴더·파일은 `.gitignore` 덕분에 자동으로 빠집니다. 특히 `.env`에 넣은 키가 올라가지 않으니 안심하세요.

---

## ② Netlify에 연결하기

1. **https://app.netlify.com** 에 들어가 **Sign up → GitHub로 가입**합니다.
2. 첫 화면에서 **Add new project**(또는 **Add new site**) → **Import an existing project**를 누릅니다.
3. **GitHub**를 고르고, Netlify가 GitHub에 접근하도록 **허용(Authorize)**합니다.
   - 저장소 목록에 내 저장소가 안 보이면 **Configure the Netlify app on GitHub**를 눌러 그 저장소를 허용해 주세요.
4. 내 저장소(예: `my-classapp`)를 고릅니다.
5. 설정 화면이 나오면 **아무것도 바꾸지 않아도 됩니다.** 앱 안의 `netlify.toml` 파일이 알아서 채워 줘요.
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. (선택) 같은 화면의 **Environment variables**, 또는 배포 후 **Project configuration(Site configuration) → Environment variables**에서 아래 값을 넣을 수 있어요.

   | 이름 | 값 | 설명 |
   | --- | --- | --- |
   | `VITE_DEMO_MODE` | `true` 또는 `false` | `true`면 샘플 데이터와 "선생님/학생으로 보기" 버튼이 보여요. 시연용은 `true` |
   | `VITE_AI_MODE` | `mock` 또는 `gemini` | 처음 열었을 때의 AI 모드. 보통은 비워 두고 앱의 AI 설정에서 바꿔요 |
   | `GEMINI_API_KEY` | (비워 두기 권장) | 서버 기본 키. 넣으면 배포 주소를 아는 **누구나** 이 키를 쓸 수 있어요 |

   > 🔐 **Gemini 키를 `VITE_`로 시작하는 이름에 절대 넣지 마세요.** `VITE_` 값은 누구나 볼 수 있는 화면 코드에 그대로 들어갑니다.
   > 환경변수를 바꾼 뒤에는 **Deploys → Trigger deploy → Deploy site**를 눌러야 반영돼요.

7. **Deploy**(또는 **Deploy my-classapp**) 버튼을 누릅니다.
8. 1~2분 기다리면 `Published`가 뜨고 `https://무작위이름.netlify.app` 주소가 생깁니다.

### 주소 이름 바꾸기

**Project configuration(Site configuration) → General → Change project name(Change site name)**에서
`무작위이름`을 `philosophy-5-3`처럼 바꾸면 주소가 `https://philosophy-5-3.netlify.app`이 됩니다.

---

## ③ 배포가 잘 됐는지 확인하기

1. 배포 주소를 열고 **선생님 화면**으로 들어갑니다.
2. **AI 설정**에서 Gemini API 키를 넣고 **[키가 동작하는지 확인]** → `키가 잘 동작해요!`가 나오면 AI 서버도 잘 올라간 거예요.
   (키 받는 법: [setup-gemini.md](./setup-gemini.md))
3. **입장 QR** 메뉴에서 QR코드와 학급 코드를 확인하고 **[인쇄하기]**를 눌러 봅니다.
4. 휴대폰으로 주소를 열어 글자 크기와 버튼이 편하게 눌리는지 확인합니다.

---

## 앱을 고치면?

GitHub 저장소의 파일을 고치면 **Netlify가 자동으로 다시 배포**합니다. (1~2분)

- GitHub 웹사이트에서 바로 고치기: 저장소에서 `src/config/appConfig.ts`를 열고 → 오른쪽 위 **연필(✏️) 버튼** → 고치기 → 초록 **Commit changes** 버튼
- 무엇을 고칠 수 있는지는 [customize.md](./customize.md)를 보세요.

---

## 지금 버전에서 알아 둘 점

지금은 데이터가 **각 브라우저에 저장되는 로컬 모드**입니다. 그래서:

- 선생님이 만든 과제·루틴은 **선생님 기기에만** 있고, 학생 휴대폰에서는 보이지 않아요.
- 한 기기(교실 TV, 노트북)에서 **"선생님으로 보기 / 학생으로 보기"를 오가며 시연**하기에 알맞습니다.
- 학생들이 각자 기기로 함께 쓰려면 나중에 **Firebase(온라인 저장소·로그인)**를 붙이면 됩니다.
  화면 코드는 그대로 두고 저장소 부분만 바꾸도록 설계되어 있어요. ([firebase-structure.md](./firebase-structure.md))

## 문제가 생겼을 때

| 증상 | 해결 |
| --- | --- |
| 배포가 `Failed`로 끝나요 | **Deploys → 실패한 배포 → Deploy log** 맨 아래 빨간 줄을 확인하세요. 대부분 오타입니다. 최근에 고친 파일을 되돌려 보세요 |
| AI가 `AI 서버가 켜져 있지 않아요`라고 해요 | Netlify Drop이 아니라 GitHub 연결로 배포했는지, 저장소에 `netlify/functions` 폴더가 있는지 확인하세요 |
| AI가 `API 키가 올바르지 않아요`라고 해요 | AI 설정에서 키를 지우고 다시 붙여 넣으세요 |
| 새로고침하면 `Page not found`가 나와요 | 저장소 맨 위에 `netlify.toml` 파일이 있는지 확인하세요 |
| 고쳤는데 화면이 그대로예요 | 1~2분 기다린 뒤, 브라우저에서 강력 새로고침(Ctrl+Shift+R, 맥은 Cmd+Shift+R) |
