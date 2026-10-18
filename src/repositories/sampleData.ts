// 데모 모드용 샘플 데이터(어학원 영어반): 클래스 1개, 수강생 12명(+가입 대기 2명), 과제 2개와 제출물·AI 피드백,
// 루틴 2개 2주 치 인증, 튜터 대화 3개. 날짜는 항상 "오늘" 기준으로 만들어집니다.
// ✏️ 고치기 좋은 부분: 수강생 이름(STUDENT_NAMES), 샘플 글(DIARY_TEXTS, OPINION_TEXTS)

import { appConfig } from '../config/appConfig';
import { rubricTemplates } from '../prompts/rubricTemplates';
import { buildMockFeedback } from '../services/MockAiClient';
import type { Assignment, Member, Routine, RoutineLog, Submission, TutorMessage, TutorRoom } from '../types';
import { studentEmail } from '../utils/id';
import { addDaysKst, endOfKstDayIso, todayKst } from '../utils/kstDate';
import { isRoutineDay } from '../utils/stats';
import { routineLogId } from './AppRepository';
import type { LocalDb, LocalUser } from './LocalRepository';

export const DEMO_TEACHER_UID = 'demo-teacher';
export const DEMO_STUDENT_UID = 'demo-s01';
export const DEMO_CLASS_ID = 'demo-class';
export const DEMO_CLASS_CODE = 'DEMO26';
/** 데모 학생 비밀번호 '1234' 의 해시 */
const DEMO_PASSWORD_HASH = 'a39d833417e33001e39e86be6e7d703ebb7ee0e55e075e9cc1eaee68c77c98b3';

const STUDENT_NAMES = ['김하늘', '이도윤', '박서연', '최지호', '정하린', '강민준', '조유나', '윤서준', '장예린', '임태오', '한소율', '오지안'];
const PENDING_NAMES = ['신우주', '배나래'];

const DIARY_TEXTS = [
  'Last weekend, I went to the Han River with my family. We rode bikes for two hours and ate chicken on the grass.\n\nThe best part was the sunset. The sky turned orange and pink. I felt very happy because we were all together.\n\nNext weekend, I want to go there again with my friends.',
  'On Saturday I stay home. I play game and watch TV. It was fun. Sunday I go to library and read a book.',
  'Last Sunday, I baked cookies with my older sister for the first time. First, we mixed butter and sugar. Also, we added chocolate chips. However, we burned the first batch!\n\nWe laughed a lot and tried again. The second batch was delicious. I learned that mistakes can be fun.',
  'I went to the shopping mall on Saturday. I bought new shoes. They are very good. I very like them.',
];

const OPINION_TEXTS = [
  'I think students should not use smartphones in class.\n\nFirst, notifications break our focus. For example, last week a phone rang during our test and everyone stopped writing. Second, students talk less with friends during breaks.\n\nHowever, some people say phones are useful for searching words. But we can use paper dictionaries or the teacher\'s computer. In conclusion, phones should stay in our bags during class.',
  'Smartphones are good in class because we can search new words quickly. Also we can call our parents. So I agree.',
  'I believe smartphones are okay only when the teacher allows it. They are helpful for research projects, but many students play games when nobody is watching.\n\nSo the best rule is simple: phones away, unless the teacher says "phones out".',
];

/** 늘 같은 결과가 나오는 간단한 난수 (데모가 매번 똑같이 보이도록) */
function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function isoAt(date: string, hour: number, minute = 0): string {
  // 한국 시간 date hour:minute → ISO
  const h = String(hour).padStart(2, '0');
  const m = String(minute).padStart(2, '0');
  return new Date(`${date}T${h}:${m}:00+09:00`).toISOString();
}

export function buildSampleDb(now: Date = new Date()): LocalDb {
  const today = todayKst(now);
  const rand = seededRandom(2026);

  // ── 사람 ──
  const users: LocalUser[] = [
    { uid: DEMO_TEACHER_UID, role: 'teacher', name: 'Jenny 강사님', email: 'teacher@classapp.local', passwordHash: '' },
  ];
  const members: Member[] = [
    {
      uid: DEMO_TEACHER_UID,
      classId: DEMO_CLASS_ID,
      role: 'teacher',
      studentNo: '',
      name: 'Jenny 강사님',
      approved: true,
      joinedAt: isoAt(addDaysKst(today, -21), 9),
    },
  ];
  [...STUDENT_NAMES, ...PENDING_NAMES].forEach((name, i) => {
    const no = String(i + 1);
    const uid = `demo-s${no.padStart(2, '0')}`;
    const approved = i < STUDENT_NAMES.length;
    users.push({ uid, role: 'student', name, email: studentEmail(DEMO_CLASS_CODE, no), passwordHash: DEMO_PASSWORD_HASH });
    members.push({
      uid,
      classId: DEMO_CLASS_ID,
      role: 'student',
      studentNo: no,
      name,
      approved,
      joinedAt: isoAt(addDaysKst(today, approved ? -20 : 0), 8, i),
      resetRequested: i === 4 ? true : undefined,
    });
  });
  const students = members.filter((m) => m.role === 'student' && m.approved);

  // ── 과제 ──
  const diary = rubricTemplates[0];
  const opinion = rubricTemplates[1];
  const assignments: Assignment[] = [
    {
      id: 'demo-a1',
      classId: DEMO_CLASS_ID,
      title: 'My Weekend (영어 일기)',
      prompt: '지난 주말에 한 일을 영어로 5문장 이상 써 보세요. 과거 시제(went, ate, played)를 쓰고, 기분과 그 이유도 넣어 보세요.',
      dueAt: endOfKstDayIso(addDaysKst(today, 3)),
      minChars: 150,
      maxChars: 800,
      rubric: diary.rubric,
      feedbackRelease: 'instant',
      tone: 'coach',
      createdAt: isoAt(addDaysKst(today, -7), 9),
    },
    {
      id: 'demo-a2',
      classId: DEMO_CLASS_ID,
      title: 'Opinion Essay: Phones in Class?',
      prompt: opinion.suggestedPrompt + ' 반대 의견(However, some people say…)도 한 번 다뤄 보세요.',
      dueAt: endOfKstDayIso(addDaysKst(today, 6)),
      minChars: 150,
      maxChars: 1200,
      rubric: opinion.rubric,
      feedbackRelease: 'teacher',
      tone: 'editor',
      createdAt: isoAt(addDaysKst(today, -2), 9),
    },
  ];

  const submissions: Submission[] = [];
  students.forEach((s, i) => {
    // 영어 일기: 10명 제출, 그중 일부는 고쳐 쓰기까지
    if (i < 10) {
      const text = DIARY_TEXTS[i % DIARY_TEXTS.length];
      const day = addDaysKst(today, -5 + (i % 4));
      const versions = [
        { text, ai: buildMockFeedback(text, diary.rubric, 150), released: true, teacherComment: '', createdAt: isoAt(day, 19, i) },
      ];
      if (i === 0 || i === 3 || i === 7) {
        const revised = `${text}\n\nThis weekend taught me something important. I want to spend more time with the people I love, because those moments make me happy.`;
        versions.push({
          text: revised,
          ai: buildMockFeedback(revised, diary.rubric, 150),
          released: true,
          teacherComment: i === 0 ? 'Great job! 고쳐 쓴 마지막 문단에서 because 로 이유를 밝힌 점이 정말 좋아요.' : '',
          createdAt: isoAt(addDaysKst(day, 1), 20, i),
        });
      }
      submissions.push({
        id: `demo-sub-a1-${s.uid}`,
        classId: DEMO_CLASS_ID,
        assignmentId: 'demo-a1',
        uid: s.uid,
        versions,
        status: 'released',
        studentUnread: i === 0,
        updatedAt: versions[versions.length - 1].createdAt,
      });
    }
    // 영어 에세이: 7명 제출 (김하늘 제외), 강사 확인 대기 4명 / 공개 3명
    if (i >= 1 && i <= 7) {
      const text = OPINION_TEXTS[i % OPINION_TEXTS.length];
      const released = i >= 5;
      const createdAt = isoAt(addDaysKst(today, -1), 18, i * 3);
      submissions.push({
        id: `demo-sub-a2-${s.uid}`,
        classId: DEMO_CLASS_ID,
        assignmentId: 'demo-a2',
        uid: s.uid,
        versions: [
          {
            text,
            ai: buildMockFeedback(text, opinion.rubric, 150),
            released,
            teacherComment: released ? '이유를 두 가지나 들었네요. Nice! However 로 반대 의견을 한 문단 더 써 봐요.' : '',
            createdAt,
          },
        ],
        status: released ? 'released' : 'waiting',
        studentUnread: released,
        updatedAt: createdAt,
      });
    }
  });

  // ── 루틴 (2주 치) ──
  const start = addDaysKst(today, -14);
  const routines: Routine[] = [
    {
      id: 'demo-r1',
      classId: DEMO_CLASS_ID,
      title: '영단어 20개 외우기',
      description: '오늘 외운 단어 중 가장 어려웠던 단어 3개를 영어로 적어 주세요.',
      days: [],
      startDate: start,
      endDate: addDaysKst(today, 30),
      createdAt: isoAt(start, 8),
    },
    {
      id: 'demo-r2',
      classId: DEMO_CLASS_ID,
      title: '듣기·쉐도잉 15분',
      description: '들은 음원(교재 Unit)과 따라 말한 문장 한 줄을 남겨요.',
      days: [1, 2, 3, 4, 5],
      startDate: start,
      endDate: addDaysKst(today, 30),
      createdAt: isoAt(start, 8, 5),
    },
  ];
  const wordSamples = ['ambitious, curious, gather', 'journey, protect, recycle', 'brave, imagine, success', 'library, borrow, return'];
  const bookSamples = ['Unit 3 — Could you tell me the way to the station?', 'Unit 4 — I have never been to Jeju Island.', 'Unit 4 — How long have you lived here?'];

  const routineLogs: RoutineLog[] = [];
  students.forEach((s, si) => {
    const diligence = si === 0 ? 1 : 0.45 + rand() * 0.5; // 김하늘은 꾸준한 수강생
    routines.forEach((r, ri) => {
      for (let d = -14; d <= 0; d += 1) {
        const date = addDaysKst(today, d);
        if (!isRoutineDay(r, date)) continue;
        // 데모 학생은 오늘은 아직 안 해서 "오늘 할 일"에 보이게 합니다.
        if (si === 0 && d === 0) continue;
        if (si === 0 && d < -9) continue; // 연속 기록이 7일 배지를 막 넘긴 상태
        if (si !== 0 && rand() > diligence) continue;
        const text = ri === 0 ? wordSamples[(si + d + 20) % wordSamples.length] : bookSamples[(si + d + 20) % bookSamples.length];
        const createdAt = isoAt(date, 20, (si * 7 + ri * 3) % 60);
        routineLogs.push({
          id: routineLogId(r.id, s.uid, date),
          classId: DEMO_CLASS_ID,
          routineId: r.id,
          uid: s.uid,
          date,
          text,
          imageUrls: [],
          createdAt,
          updatedAt: createdAt,
        });
      }
    });
  });

  // ── 튜터 ──
  const tutorRooms: TutorRoom[] = [
    {
      id: 'demo-t1',
      classId: DEMO_CLASS_ID,
      topic: '현재완료 (Present Perfect)',
      persona: '문법을 차근차근 짚어 주는 꼼꼼한 강사',
      teacherInstruction: '교재 Unit 4 범위에서만 다뤄 주세요. have + p.p. 형태를 학생이 직접 만들어 보게 해 주세요.',
      createdAt: isoAt(addDaysKst(today, -6), 9),
    },
    {
      id: 'demo-t2',
      classId: DEMO_CLASS_ID,
      topic: '1분 자기소개 스피치',
      persona: '발표·면접 영어를 연습시키는 스피치 코치',
      teacherInstruction: '문장은 짧게, 발표하기 좋은 표현 위주로 도와주세요.',
      createdAt: isoAt(addDaysKst(today, -3), 9),
    },
  ];
  const conversations: { uid: string; roomId: string; turns: [string, string][] }[] = [
    {
      uid: DEMO_STUDENT_UID,
      roomId: 'demo-t1',
      turns: [
        ['현재완료 답 알려줘. "나는 제주도에 가 본 적 있다" 영어로 뭐야?', '좋은 질문이야! 바로 알려 주기보다 같이 만들어 보자. 현재완료는 have + 과거분사(p.p.) 모양이야. "가다(go)"의 과거분사는 무엇일까? 🙂'],
        ['gone? been?', '정확해, 둘 다 과거분사야! 그런데 "가 본 적이 있다(경험)"를 말할 때는 둘 중 어떤 걸 쓸까? 힌트: "gone"은 "가 버려서 지금 여기 없다"는 느낌이야.'],
      ],
    },
    {
      uid: 'demo-s02',
      roomId: 'demo-t1',
      turns: [
        ['현재완료랑 과거형 차이가 뭐야?', '오, 많은 사람이 헷갈리는 부분이야! "I lost my key."와 "I have lost my key." 중에서 지금도 열쇠가 없는 느낌이 더 강한 쪽은 어느 쪽일까?'],
        ['have lost?', '맞아! 현재완료는 과거의 일이 지금까지 이어질 때 써. 그럼 "yesterday"가 들어간 문장에는 어느 쪽이 어울릴지 예문을 하나 만들어 볼래?'],
      ],
    },
    {
      uid: 'demo-s03',
      roomId: 'demo-t2',
      turns: [
        ['자기소개 첫 문장 써줘', '첫 문장은 네 목소리로 만드는 게 좋아! 듣는 사람에게 인사하고 나를 한 단어로 소개해 본다면 어떤 단어가 떠올라? (예: curious, sporty)'],
        ['Hello everyone, I am a sporty person!', 'Great start! 🎤 이제 "sporty"를 보여 주는 예를 하나 붙여 볼까? "I love …ing" 모양으로 한 문장 만들어 봐.'],
      ],
    },
  ];
  const tutorMessages: TutorMessage[] = [];
  conversations.forEach((c, ci) => {
    c.turns.forEach(([q, a], ti) => {
      const date = addDaysKst(today, -2 + ci);
      tutorMessages.push(
        { id: `demo-m-${ci}-${ti}-q`, classId: DEMO_CLASS_ID, roomId: c.roomId, uid: c.uid, role: 'student', text: q, createdAt: isoAt(date, 16, ti * 4) },
        { id: `demo-m-${ci}-${ti}-a`, classId: DEMO_CLASS_ID, roomId: c.roomId, uid: c.uid, role: 'tutor', text: a, createdAt: isoAt(date, 16, ti * 4 + 1) },
      );
    });
  });

  return {
    version: 1,
    users,
    classes: [
      {
        id: DEMO_CLASS_ID,
        name: '중급 영어 A반',
        code: DEMO_CLASS_CODE,
        teacherUid: DEMO_TEACHER_UID,
        mode: appConfig.mode,
        enabledModules: ['assignments', 'routines', 'tutor'],
        createdAt: isoAt(addDaysKst(today, -21), 9),
      },
    ],
    members,
    assignments,
    submissions,
    routines,
    routineLogs,
    tutorRooms,
    tutorMessages,
    aiUsage: {},
  };
}
