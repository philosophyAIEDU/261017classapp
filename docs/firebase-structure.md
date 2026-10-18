# Firebase 데이터 구조 (나중에 추가할 때 참고)

지금 앱은 데이터를 **각 브라우저에 저장하는 로컬 모드**(`LocalRepository`)로 동작합니다.
학생들이 각자 기기에서 함께 쓰려면 Firebase(Authentication · Firestore · Storage)를 붙이면 됩니다.

## 이미 준비된 것

- 모든 화면은 `src/repositories/AppRepository.ts`의 **약속(인터페이스)**만 사용합니다.
  Firebase를 붙일 때는 같은 약속을 지키는 `FirebaseRepository.ts`를 만들고,
  `src/repositories/index.ts`에서 `VITE_DATA_MODE=firebase`일 때 그것을 고르게 하면 됩니다. **화면 코드는 바꾸지 않아요.**
- 데이터 모양(타입)은 `src/types/index.ts`에 아래 구조와 같은 이름으로 정의되어 있습니다.
- 루틴 인증 문서 아이디는 `루틴_학생_날짜` 형식(`routineLogId`)이라, Firestore에서도 **하루 1회**가 저절로 지켜집니다.

## Firestore 구조

```
classes/{classId}            # name, code, teacherUid, mode, enabledModules, createdAt
  members/{uid}              # role, studentNo, name, approved, joinedAt, resetRequested
  assignments/{id}           # title, prompt, dueAt, minChars, maxChars, rubric[], feedbackRelease, tone
  submissions/{id}           # assignmentId, uid, versions[{text, ai, released, teacherComment, createdAt}], status, studentUnread
  routines/{id}              # title, description, days[], startDate, endDate
  routineLogs/{id}           # routineId, uid, date(KST 'yyyy-MM-dd'), text, imageUrls[]
  tutorRooms/{id}            # topic, persona, teacherInstruction
  tutorMessages/{id}         # roomId, uid, role('student'|'tutor'), text, createdAt
  aiUsage/{uid_date}         # count  (서버 함수만 씀)
```

## 학생 로그인

- 학생은 실제 이메일 없이 **클래스 코드 + 번호 + 이름 + 비밀번호**로 가입합니다.
- 내부적으로는 합성 이메일 `{학급코드}-{번호}@classapp.local`로 Firebase 이메일 인증을 씁니다. (`src/utils/id.ts`의 `studentEmail`)
- 교사가 승인(`members/{uid}.approved = true`)해야 활성화됩니다.

## Firebase를 붙일 때 함께 할 일 (체크리스트)

- [ ] `src/services/firebase.ts`, `src/repositories/FirebaseRepository.ts`
- [ ] 교사 Google 로그인, 학생 가입·승인, 비밀번호 초기화 처리
- [ ] Netlify Functions에서 `Authorization: Bearer <Firebase ID 토큰>`을 `firebase-admin`의 `verifyIdToken`으로 검증 (실패 시 401)
- [ ] 학생별 하루 AI 호출 횟수를 `aiUsage`에 기록하고 초과 시 거절
- [ ] 교사의 Gemini API 키를 학생이 읽을 수 없는 서버 쪽에 보관 → 학생 기기에서도 진짜 AI 사용
- [ ] `firestore.rules`: 학생은 자기 제출물·인증·대화만 쓰기, 자기 학급 공개 데이터만 읽기 / 교사는 자기 학급 전체 / 미승인 학생은 쓰기 금지
- [ ] `storage.rules`: 본인 폴더에만, 이미지 형식만, 2MB 이하
