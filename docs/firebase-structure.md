# Firebase 데이터 구조

연결 방법은 [setup-firebase.md](./setup-firebase.md)를 보세요. 이 문서는 "어디에 무엇이 저장되는지" 설명합니다.

- 화면은 `src/repositories/AppRepository.ts`의 약속(인터페이스)만 씁니다.
  `VITE_DATA_MODE=firebase`면 `FirebaseRepository`, 아니면 `LocalRepository`(브라우저 저장)가 선택돼요. (`src/repositories/index.ts`)
- 데이터 모양(타입)은 `src/types/index.ts`와 같은 이름을 씁니다. 날짜·시각은 모두 글자(ISO, KST 날짜 `yyyy-MM-dd`)로 저장해요.
- 누가 무엇을 읽고 쓸 수 있는지는 `firestore.rules`에 있어요.

## Firestore 구조

```
users/{uid}                  # uid, role('teacher'|'student'), name, email, classId   ← 로그인한 사람의 소속
classCodes/{code}            # classId, teacherUid                                    ← 6자리 코드로 클래스 찾기 (목록 보기 금지)

classes/{classId}            # id, name, code, teacherUid, teacherEmail, mode, enabledModules, createdAt
  members/{uid}              # uid, classId, role, studentNo, name, approved, joinedAt
  resetRequests/{id}         # studentNo, name, createdAt                              ← 비밀번호 초기화 요청
  assignments/{id}           # title, prompt, dueAt, minChars, maxChars, rubric[], feedbackRelease, tone
  submissions/{id}           # assignmentId, uid, versions[{text, ai, released, teacherComment, createdAt}], status, studentUnread
  routines/{id}              # title, description, days[], startDate, endDate
  routineLogs/{routineId_uid_date}   # routineId, uid, date(KST), text, imageUrls[]     ← 아이디 덕분에 하루 1회
  photos/{id}                # uid, dataUrl(압축 사진), createdAt                       ← Storage 대신 사용
  tutorRooms/{id}            # topic, persona, teacherInstruction
  tutorMessages/{id}         # roomId, uid, role('student'|'tutor'), text, createdAt
  aiUsage/{uid_date}         # uid, date, count(전체), tutor(튜터)                      ← 서버 함수가 1씩 늘림
```

## 로그인

- **강사님**: Google 로그인. 처음 로그인하면 `users/{uid}`가 `role: 'teacher'`로 만들어져요.
- **수강생**: 합성 이메일 `{클래스코드}-{번호}@classapp.local` + 비밀번호(6자 이상)로 Firebase 이메일 인증. (`src/utils/id.ts`의 `studentEmail`)
  가입하면 `members/{uid}.approved = false` → 강사님이 승인하면 `true`.
- **비밀번호 초기화**: 수강생이 `resetRequests`에 요청 → 강사님이 [임시 비밀번호 만들기] → 서버 함수 `reset-password`가 관리자 권한으로 변경.

## 서버 함수 (netlify/functions)

| 함수 | 하는 일 | Firebase 모드에서 확인하는 것 |
| --- | --- | --- |
| `feedback` | 과제 글 AI 첨삭 | 로그인 토큰 → 승인된 구성원 → 하루 사용량(+1) |
| `tutor` | AI 튜터 답변 | 위와 같음 + 튜터 질문 횟수 |
| `check-key` | API 키 확인 | 강사님만 |
| `reset-password` | 수강생 비밀번호 초기화 | 강사님만, `FIREBASE_SERVICE_ACCOUNT` 필요 |

- 토큰 확인은 `firebase-admin`의 `verifyIdToken`(프로젝트 ID만으로 초기화)으로 합니다. 실패하면 401.
- 구성원 확인과 사용량 기록은 **그 사람의 토큰으로** Firestore를 읽고 써서, 서버도 `firestore.rules`를 똑같이 따릅니다.
- `aiUsage`는 규칙상 "정확히 1씩 늘리기"만 가능해서 수강생이 직접 횟수를 줄일 수 없어요.

## 알려진 한계

- 수강생은 자기 제출물 문서 전체를 쓸 수 있어서, 마음먹고 조작하면 자기 글의 AI 피드백 내용을 바꿀 수 있어요. (다른 수강생 글은 불가) 성적에 바로 쓰는 용도라면 강사님 확인 후 공개 방식을 쓰세요.
- 튜터 답변 메시지도 수강생 기기가 저장합니다. (서버가 저장하려면 서비스 계정이 필요해서 단순한 방식을 택했어요)
