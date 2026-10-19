// "이 사람이 지금 AI를 써도 되나요?"를 판단합니다.
// - 로컬 모드: 로그인 확인 없이 (데모·시연용). 무료 티어 횟수만 이 서버 안에서 대략 셉니다.
// - Firebase 모드: ① 로그인 토큰 확인 → ② 우리 클래스의 승인된 구성원인지 → ③ 무료 티어 횟수(앱 전체) → ④ 수강생 하루 횟수
// 🔒 바꾸면 안 되는 안전 규칙입니다. 횟수 자체는 src/config/appConfig.ts 의 ai.freeTier / ai.dailyAiLimit / ai.tutorDailyLimit 에서 바꾸세요.

import { appConfig, terms } from '../../../src/config/appConfig';
import { kstMinuteKey, todayKst } from '../../../src/utils/kstDate';
import { isFirebaseMode, verifyUser } from './firebaseAdmin';
import { getDocAs, incrementCounters, type CounterWrite } from './firestoreRest';
import { asString, FriendlyError } from './http';

export type AiPurpose = 'feedback' | 'tutor' | 'check';

export interface AiAccess {
  /** 서버 기본 키(GEMINI_API_KEY)를 써도 되는지 */
  allowEnvKey: boolean;
  /** 사용량 +1 하고 한도를 넘었으면 거절 (API 키 확인이 끝난 뒤, Gemini 를 부르기 직전에 호출) */
  consume: () => Promise<void>;
}

/** TEACHER_EMAILS="a@gmail.com, b@gmail.com" → 이 강사님들의 클래스만 서버 기본 키를 씁니다. */
export function teacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** 무료 티어 한도 확인 (분당·하루, 앱 전체) */
export function checkFreeTier(perMinute: number, perDay: number): void {
  const { requestsPerMinute, requestsPerDay } = appConfig.ai.freeTier;
  if (perMinute > requestsPerMinute) {
    throw new FriendlyError(429, '지금 AI를 쓰는 사람이 많아요. 1분 뒤에 다시 해 주세요. (무료 사용량 보호)');
  }
  if (perDay > requestsPerDay) {
    throw new FriendlyError(429, '오늘 우리 앱의 AI 무료 사용량을 모두 썼어요. 내일(한국 시간 자정 이후) 다시 만나요!');
  }
}

// 로컬 모드용: 이 서버가 켜져 있는 동안만 세는 간단한 계수기 (Netlify 는 여러 서버를 띄울 수 있어 대략적이에요)
const localCounter = { minute: '', perMinute: 0, day: '', perDay: 0 };

export function resetLocalCounter(): void {
  Object.assign(localCounter, { minute: '', perMinute: 0, day: '', perDay: 0 });
}

function consumeLocal(now: Date = new Date()): void {
  const minute = kstMinuteKey(now);
  const day = todayKst(now);
  if (localCounter.minute !== minute) Object.assign(localCounter, { minute, perMinute: 0 });
  if (localCounter.day !== day) Object.assign(localCounter, { day, perDay: 0 });
  localCounter.perMinute += 1;
  localCounter.perDay += 1;
  checkFreeTier(localCounter.perMinute, localCounter.perDay);
}

export async function checkAiAccess(req: Request, body: Record<string, unknown>, purpose: AiPurpose): Promise<AiAccess> {
  if (!isFirebaseMode()) return { allowEnvKey: true, consume: async () => consumeLocal() };

  const { token, user } = await verifyUser(req);
  const classId = asString(body.classId).trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(classId)) throw new FriendlyError(400, `${terms.group} 정보가 없어요. 다시 로그인해 주세요.`);

  const [cls, member] = await Promise.all([getDocAs(token, `classes/${classId}`), getDocAs(token, `classes/${classId}/members/${user.uid}`)]);
  if (!cls || !member) throw new FriendlyError(403, `이 ${terms.group}의 구성원만 AI를 쓸 수 있어요.`);
  if (member.approved !== true) throw new FriendlyError(403, `${terms.teacher}의 승인 후에 AI를 쓸 수 있어요.`);

  const isTeacher = cls.teacherUid === user.uid;
  if (purpose === 'check' && !isTeacher) throw new FriendlyError(403, `${terms.teacher}만 쓸 수 있는 기능이에요.`);

  const allowed = teacherEmails();
  const allowEnvKey = allowed.length > 0 && typeof cls.teacherEmail === 'string' && allowed.includes(cls.teacherEmail.toLowerCase());

  const consume = async () => {
    const now = new Date();
    const day = todayKst(now);
    const minute = kstMinuteKey(now);
    // 무료 티어는 API 키(구글 프로젝트) 단위라서, 클래스가 여러 개여도 앱 전체를 함께 셉니다. (강사님 호출 포함)
    const writes: CounterWrite[] = [
      { path: `aiQuota/m_${minute}`, fields: { key: minute, lastClassId: classId }, increments: { count: 1 } },
      { path: `aiQuota/d_${day}`, fields: { key: day, lastClassId: classId }, increments: { count: 1 } },
    ];
    if (!isTeacher) {
      writes.push({
        path: `classes/${classId}/aiUsage/${user.uid}_${day}`,
        fields: { uid: user.uid, date: day },
        increments: { count: 1, tutor: purpose === 'tutor' ? 1 : 0 },
      });
    }
    const [perMinute, perDay, personal] = await incrementCounters(token, writes);
    checkFreeTier(perMinute.count, perDay.count);
    if (personal) {
      if (personal.count > appConfig.ai.dailyAiLimit) {
        throw new FriendlyError(429, `오늘 AI 사용 횟수(${appConfig.ai.dailyAiLimit}번)를 모두 썼어요. 내일 다시 만나요!`);
      }
      if (purpose === 'tutor' && personal.tutor > appConfig.ai.tutorDailyLimit) {
        throw new FriendlyError(429, `오늘 튜터 질문(${appConfig.ai.tutorDailyLimit}번)을 모두 썼어요. 내일 다시 물어봐 주세요!`);
      }
    }
  };
  return { allowEnvKey, consume };
}
