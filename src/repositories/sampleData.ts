// 데모 모드용 샘플 데이터: 학급 1개, 학생 12명(+가입 대기 2명), 과제 2개와 제출물·AI 피드백,
// 루틴 2개 2주 치 인증, 튜터 대화 3개. 날짜는 항상 "오늘" 기준으로 만들어집니다.
// ✏️ 고치기 좋은 부분: 학생 이름(STUDENT_NAMES), 샘플 글(READING_TEXTS, ARGUMENT_TEXTS)

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

const READING_TEXTS = [
  '『어린 왕자』를 읽었다. 어린 왕자는 자기 별의 장미와 다투고 여행을 떠난다. 여러 별에서 이상한 어른들을 만나고, 지구에서 여우를 만나 길들인다는 것의 뜻을 배운다.\n\n가장 기억에 남는 장면은 여우가 "가장 중요한 것은 눈에 보이지 않아"라고 말하는 장면이다. 왜냐하면 나도 친구와 다툰 적이 있는데, 그 친구가 나에게 얼마나 소중한지 나중에야 알았기 때문이다.\n\n앞으로는 소중한 사람에게 시간을 더 쓰고 싶다.',
  '『마당을 나온 암탉』을 읽었다. 잎싹은 알을 품고 싶어서 양계장을 나온다. 오리 알을 품어 초록머리를 키우고, 마지막에는 족제비에게 자신을 내어준다. 잎싹이 정말 용감하다고 느꼈다.',
  '『샬롯의 거미줄』은 돼지 윌버와 거미 샬롯의 우정 이야기다. 윌버가 죽을 위기에 처하자 샬롯은 거미줄에 글자를 써서 윌버를 구한다. 샬롯이 떠날 때 너무 슬펐다.\n\n나도 내 친구를 위해 무언가를 해 준 적이 있는지 생각해 보았다. 저도 친구가 힘들 때 옆에 있어 주는 사람이 되고 싶다.',
  '『나쁜 어린이 표』를 읽었다. 건우는 선생님에게 나쁜 어린이 표를 받는다. 처음엔 억울했지만 나중에는 선생님도 마음을 바꾼다. 재미있었다.',
];

const ARGUMENT_TEXTS = [
  '나는 학교에서 스마트폰 사용을 제한해야 한다고 생각한다.\n\n첫째, 수업 시간에 알림이 오면 집중이 깨진다. 실제로 우리 반에서도 알림 소리 때문에 수업이 멈춘 적이 있다. 둘째, 쉬는 시간에 친구와 대화하는 시간이 줄어든다.\n\n물론 급한 연락이 필요할 수 있다는 반대 의견도 있다. 하지만 그럴 때는 교무실 전화를 쓰면 된다. 그래서 등교 후에는 스마트폰을 모아 두는 것이 좋다.',
  '스마트폰을 허용해야 한다. 왜냐하면 모르는 것을 바로 찾아볼 수 있기 때문이다. 그리고 부모님과 연락할 수도 있다.',
  '저는 스마트폰을 수업 시간에만 쓰게 하는 것이 좋다고 생각합니다. 조사 활동을 할 때는 유용하지만, 쉬는 시간에 게임만 하는 친구들이 많기 때문입니다.\n\n선생님이 허락한 시간에만 쓰면 장점은 살리고 단점은 줄일 수 있습니다.',
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
    { uid: DEMO_TEACHER_UID, role: 'teacher', name: '이지혜 선생님', email: 'teacher@classapp.local', passwordHash: '' },
  ];
  const members: Member[] = [
    {
      uid: DEMO_TEACHER_UID,
      classId: DEMO_CLASS_ID,
      role: 'teacher',
      studentNo: '',
      name: '이지혜 선생님',
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
  const reading = rubricTemplates[0];
  const argument = rubricTemplates[1];
  const assignments: Assignment[] = [
    {
      id: 'demo-a1',
      classId: DEMO_CLASS_ID,
      title: '『어린 왕자』처럼, 나의 독서록',
      prompt: '이번 달에 읽은 책의 줄거리를 정리하고, 가장 기억에 남는 장면과 그 이유를 나의 경험과 연결해 써 보세요.',
      dueAt: endOfKstDayIso(addDaysKst(today, 3)),
      minChars: 150,
      maxChars: 800,
      rubric: reading.rubric,
      feedbackRelease: 'instant',
      tone: 'coach',
      createdAt: isoAt(addDaysKst(today, -7), 9),
    },
    {
      id: 'demo-a2',
      classId: DEMO_CLASS_ID,
      title: '학교에서 스마트폰, 허용할까?',
      prompt: argument.suggestedPrompt + ' 반대 의견도 한 번 다뤄 보세요.',
      dueAt: endOfKstDayIso(addDaysKst(today, 6)),
      minChars: 150,
      maxChars: 1200,
      rubric: argument.rubric,
      feedbackRelease: 'teacher',
      tone: 'editor',
      createdAt: isoAt(addDaysKst(today, -2), 9),
    },
  ];

  const submissions: Submission[] = [];
  students.forEach((s, i) => {
    // 독서록: 10명 제출, 그중 일부는 고쳐 쓰기까지
    if (i < 10) {
      const text = READING_TEXTS[i % READING_TEXTS.length];
      const day = addDaysKst(today, -5 + (i % 4));
      const versions = [
        { text, ai: buildMockFeedback(text, reading.rubric, 150), released: true, teacherComment: '', createdAt: isoAt(day, 19, i) },
      ];
      if (i === 0 || i === 3 || i === 7) {
        const revised = `${text}\n\n(고쳐 쓰기) 이 책을 읽고 나서 나는 친구에게 먼저 사과하는 용기를 내 보았다. 왜냐하면 소중한 것을 놓치고 싶지 않았기 때문이다.`;
        versions.push({
          text: revised,
          ai: buildMockFeedback(revised, reading.rubric, 150),
          released: true,
          teacherComment: i === 0 ? '고쳐 쓴 마지막 문단이 정말 감동적이에요. 경험과 연결한 점을 칭찬합니다!' : '',
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
    // 논설문: 7명 제출 (김하늘 제외), 교사 확인 대기 4명 / 공개 3명
    if (i >= 1 && i <= 7) {
      const text = ARGUMENT_TEXTS[i % ARGUMENT_TEXTS.length];
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
            ai: buildMockFeedback(text, argument.rubric, 150),
            released,
            teacherComment: released ? '근거를 두 가지나 들었네요. 반대 의견 부분을 조금 더 키워 봐요.' : '',
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
      description: '오늘 외운 단어 중 가장 어려웠던 단어 3개를 적어 주세요.',
      days: [],
      startDate: start,
      endDate: addDaysKst(today, 30),
      createdAt: isoAt(start, 8),
    },
    {
      id: 'demo-r2',
      classId: DEMO_CLASS_ID,
      title: '독서 15분',
      description: '읽은 책 제목과 인상 깊은 문장 한 줄을 남겨요.',
      days: [1, 2, 3, 4, 5],
      startDate: start,
      endDate: addDaysKst(today, 30),
      createdAt: isoAt(start, 8, 5),
    },
  ];
  const wordSamples = ['ambitious, curious, gather', 'journey, protect, recycle', 'brave, imagine, success', 'library, borrow, return'];
  const bookSamples = ['『어린 왕자』 — 가장 중요한 것은 눈에 보이지 않아.', '『샬롯의 거미줄』 — 넌 내 친구야.', '『나무를 심은 사람』 — 한 사람의 꾸준함이 숲을 만든다.'];

  const routineLogs: RoutineLog[] = [];
  students.forEach((s, si) => {
    const diligence = si === 0 ? 1 : 0.45 + rand() * 0.5; // 김하늘은 꾸준한 학생
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
      topic: '광합성 단원',
      persona: '실험을 좋아하는 열정적인 과학자',
      teacherInstruction: '교과서 3단원 범위에서만 다뤄 주세요. 실험 관찰 결과와 연결하도록 유도해 주세요.',
      createdAt: isoAt(addDaysKst(today, -6), 9),
    },
    {
      id: 'demo-t2',
      classId: DEMO_CLASS_ID,
      topic: '분수의 나눗셈',
      persona: appConfig.ai.defaultTutorPersona,
      teacherInstruction: '그림(피자, 막대)으로 생각해 보도록 도와주세요.',
      createdAt: isoAt(addDaysKst(today, -3), 9),
    },
  ];
  const conversations: { uid: string; roomId: string; turns: [string, string][] }[] = [
    {
      uid: DEMO_STUDENT_UID,
      roomId: 'demo-t1',
      turns: [
        ['광합성 식 알려줘', '좋은 질문이야! 식물이 광합성을 할 때 꼭 필요한 재료 세 가지가 뭘까? 하나는 햇빛이야. 나머지 두 개를 떠올려 볼래?'],
        ['물이랑 이산화탄소?', '정확해! 🌱 그럼 그 재료들로 식물은 무엇을 만들어 낼까? 우리가 실험에서 아이오딘 용액을 떨어뜨렸던 걸 떠올려 봐.'],
      ],
    },
    {
      uid: 'demo-s02',
      roomId: 'demo-t1',
      turns: [
        ['왜 잎은 초록색이야?', '오, "왜"를 묻는 건 탐구의 시작이야! 잎 속에 있는 어떤 작은 알갱이가 햇빛을 받는 일을 한다고 배웠지? 그 이름을 기억해 볼래?'],
        ['엽록체 광합성 관계', '좋아! 엽록체가 햇빛을 받는다면, 빛이 없는 곳에 둔 잎은 어떻게 될까? 우리가 했던 실험 결과와 비교해 봐.'],
      ],
    },
    {
      uid: 'demo-s03',
      roomId: 'demo-t2',
      turns: [
        ['분수의 나눗셈 답 알려줘', '바로 답을 말해 주기보다 같이 생각해 보자. 피자 3/4판을 1/4판씩 나누면 몇 조각이 될까? 그림으로 그려 볼래?'],
        ['3조각!', '맞아! 그럼 3/4 ÷ 1/4 = 3 이 되는 거네. 이번엔 피자 1판을 1/3씩 나누면 몇 조각일까?'],
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
        name: '5학년 3반',
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
