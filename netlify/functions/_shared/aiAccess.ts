// "이 사람이 지금 AI를 써도 되나요?"를 판단합니다.
// - 로컬 모드: 예전처럼 누구나 (데모·시연용)
// - Firebase 모드: ① 로그인 토큰 확인 → ② 우리 클래스의 승인된 구성원인지 → ③ 수강생이면 하루 사용량 +1 후 제한 확인
// 🔒 바꾸면 안 되는 안전 규칙입니다. 횟수 자체는 src/config/appConfig.ts 의 ai.dailyAiLimit / ai.tutorDailyLimit 에서 바꾸세요.

import { appConfig, terms } from '../../../src/config/appConfig';
import { todayKst } from '../../../src/utils/kstDate';
import { isFirebaseMode, verifyUser } from './firebaseAdmin';
import { getDocAs, incrementUsage } from './firestoreRest';
import { asString, FriendlyError } from './http';

export type AiPurpose = 'feedback' | 'tutor' | 'check';

export interface AiAccess {
  /** 서버 기본 키(GEMINI_API_KEY)를 써도 되는지 */
  allowEnvKey: boolean;
  /** 하루 사용량 +1 하고 제한을 넘었으면 거절 (API 키 확인이 끝난 뒤, Gemini 를 부르기 직전에 호출) */
  consume: () => Promise<void>;
}

/** TEACHER_EMAILS="a@gmail.com, b@gmail.com" → 이 강사님들의 클래스만 서버 기본 키를 씁니다. */
export function teacherEmails(): string[] {
  return (process.env.TEACHER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function checkAiAccess(req: Request, body: Record<string, unknown>, purpose: AiPurpose): Promise<AiAccess> {
  if (!isFirebaseMode()) return { allowEnvKey: true, consume: async () => undefined };

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
    if (isTeacher) return; // 강사님은 횟수 제한 없음
    const usage = await incrementUsage(token, classId, user.uid, todayKst(), purpose === 'tutor');
    if (usage.count > appConfig.ai.dailyAiLimit) {
      throw new FriendlyError(429, `오늘 AI 사용 횟수(${appConfig.ai.dailyAiLimit}번)를 모두 썼어요. 내일 다시 만나요!`);
    }
    if (purpose === 'tutor' && usage.tutor > appConfig.ai.tutorDailyLimit) {
      throw new FriendlyError(429, `오늘 튜터 질문(${appConfig.ai.tutorDailyLimit}번)을 모두 썼어요. 내일 다시 물어봐 주세요!`);
    }
  };
  return { allowEnvKey, consume };
}
