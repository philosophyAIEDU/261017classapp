// @vitest-environment node
// Firebase 모드 함수 테스트: 토큰 확인(401), 구성원·승인 확인(403), 하루 사용량 제한(429), 서버 기본 키 허용 범위
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();
vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status = 500;
  }
  class GoogleGenAI {
    models = { generateContent };
  }
  return { ApiError, GoogleGenAI };
});

const verifyIdToken = vi.fn();
vi.mock('firebase-admin/app', () => ({ getApps: () => [], initializeApp: () => ({}), cert: () => ({}) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken, updateUser: vi.fn() }) }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({}) }));

const feedback = (await import('../feedback')).default;
const tutor = (await import('../tutor')).default;
const checkKey = (await import('../check-key')).default;
const resetPassword = (await import('../reset-password')).default;

const rubric = [{ name: 'A', levels: ['1', '2', '3'] }];
const TEACHER_EMAIL = 'teacher@example.com';

interface FakeDb {
  cls?: Record<string, unknown> | null;
  member?: Record<string, unknown> | null;
  usage?: { count: number; tutor: number };
  /** 앱 전체 무료 티어 계수기 (분당·하루) */
  quotaMinute?: number;
  quotaDay?: number;
}

function fs(value: unknown) {
  if (typeof value === 'boolean') return { booleanValue: value };
  return { stringValue: String(value) };
}

function installFirestore(db: FakeDb) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith(':commit')) {
      const body = JSON.parse(String(init?.body)) as { writes: { update: { name: string }; updateTransforms: { fieldPath: string; increment: { integerValue: string } }[] }[] };
      const writeResults = body.writes.map((w) => {
        const name = w.update.name;
        const inc = (field: string) => Number(w.updateTransforms.find((t) => t.fieldPath === field)?.increment.integerValue ?? 0);
        if (name.includes('/aiQuota/m_')) {
          db.quotaMinute = (db.quotaMinute ?? 0) + inc('count');
          return { transformResults: [{ integerValue: String(db.quotaMinute) }] };
        }
        if (name.includes('/aiQuota/d_')) {
          db.quotaDay = (db.quotaDay ?? 0) + inc('count');
          return { transformResults: [{ integerValue: String(db.quotaDay) }] };
        }
        db.usage = { count: (db.usage?.count ?? 0) + inc('count'), tutor: (db.usage?.tutor ?? 0) + inc('tutor') };
        return { transformResults: [{ integerValue: String(db.usage.count) }, { integerValue: String(db.usage.tutor) }] };
      });
      return new Response(JSON.stringify({ writeResults }));
    }
    const doc = url.includes('/members/') ? db.member : db.cls;
    if (!doc) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify({ fields: Object.fromEntries(Object.entries(doc).map(([k, v]) => [k, fs(v)])) }));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function post(name: string, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Request(`http://localhost/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer good-token', ...headers },
    body: JSON.stringify({ classId: 'c1', ...body }),
  });
}

const feedbackBody = { assignment: { rubric }, text: 'My weekend was fun.' };
const student = { cls: { teacherUid: 'T', teacherEmail: TEACHER_EMAIL }, member: { approved: true, role: 'student' } };

beforeEach(() => {
  process.env.VITE_DATA_MODE = 'firebase';
  process.env.GEMINI_API_KEY = 'SERVER_KEY_abcdefghijklmnopqrstuvwxyz';
  process.env.TEACHER_EMAILS = TEACHER_EMAIL;
  delete process.env.FIREBASE_SERVICE_ACCOUNT;
  generateContent.mockReset().mockResolvedValue({ text: '{"praise":"좋아요"}' });
  verifyIdToken.mockReset().mockImplementation(async (t: string) => {
    if (t !== 'good-token' && t !== 'teacher-token') throw new Error('bad');
    return { uid: t === 'teacher-token' ? 'T' : 'S1' };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.VITE_DATA_MODE;
  delete process.env.GEMINI_API_KEY;
  delete process.env.TEACHER_EMAILS;
});

describe('Firebase 모드 로그인 확인', () => {
  it('토큰이 없으면 401', async () => {
    installFirestore(student);
    const req = new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ classId: 'c1', ...feedbackBody }) });
    const res = await feedback(req);
    expect(res.status).toBe(401);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('토큰이 틀리면 401', async () => {
    installFirestore(student);
    expect((await feedback(post('feedback', feedbackBody, { authorization: 'Bearer forged' }))).status).toBe(401);
  });

  it('클래스 정보가 없으면 400, 구성원이 아니면 403, 승인 전이면 403', async () => {
    installFirestore(student);
    expect((await feedback(post('feedback', { ...feedbackBody, classId: '' }))).status).toBe(400);
    installFirestore({ ...student, member: null });
    expect((await feedback(post('feedback', feedbackBody))).status).toBe(403);
    installFirestore({ ...student, member: { approved: false } });
    const res = await feedback(post('feedback', feedbackBody));
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toContain('승인');
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe('하루 사용량 제한', () => {
  it('승인된 수강생은 호출마다 1씩 세고, 하루 한도를 넘으면 429', async () => {
    const db: FakeDb = { ...student, usage: { count: 19, tutor: 0 } };
    const fetchMock = installFirestore(db);
    expect((await feedback(post('feedback', feedbackBody))).status).toBe(200); // 20번째
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith(':commit'))).toBe(true);
    const res = await feedback(post('feedback', feedbackBody)); // 21번째
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toContain('20번');
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('튜터 질문은 따로 15번까지', async () => {
    installFirestore({ ...student, usage: { count: 5, tutor: 15 } });
    const res = await tutor(post('tutor', { room: { topic: '현재완료' }, message: 'have been?' }));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toContain('튜터 질문');
  });

  it('강사님은 개인 횟수 제한이 없지만, 앱 전체 무료 티어 횟수에는 포함된다', async () => {
    const db: FakeDb = { cls: { teacherUid: 'T', teacherEmail: TEACHER_EMAIL }, member: { approved: true, role: 'teacher' }, usage: { count: 999, tutor: 999 } };
    installFirestore(db);
    expect((await feedback(post('feedback', feedbackBody, { authorization: 'Bearer teacher-token' }))).status).toBe(200);
    expect(db.usage).toEqual({ count: 999, tutor: 999 }); // 개인 횟수는 그대로
    expect(db.quotaDay).toBe(1);
  });
});

describe('Gemini 무료 티어 보호 (앱 전체)', () => {
  it('1분 한도(8번)를 넘으면 429, Gemini 를 부르지 않는다', async () => {
    installFirestore({ ...student, quotaMinute: 8 });
    const res = await feedback(post('feedback', feedbackBody));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toContain('1분 뒤');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('하루 한도(200번)를 넘으면 429', async () => {
    installFirestore({ ...student, quotaDay: 200 });
    const res = await tutor(post('tutor', { room: { topic: '현재완료' }, message: 'have been?' }));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toContain('무료 사용량');
  });

  it('답 길이 상한(maxOutputTokens)을 함께 보낸다', async () => {
    installFirestore(student);
    await feedback(post('feedback', feedbackBody));
    expect(generateContent.mock.calls[0][0].config.maxOutputTokens).toBe(1200);
  });
});

describe('서버 기본 키 허용 범위', () => {
  it('TEACHER_EMAILS 에 있는 강사님 클래스면 서버 키를 쓴다', async () => {
    installFirestore(student);
    expect((await feedback(post('feedback', feedbackBody))).status).toBe(200);
  });

  it('목록에 없는 클래스는 서버 키를 쓸 수 없다 (자기 키를 넣으면 가능)', async () => {
    installFirestore({ ...student, cls: { teacherUid: 'T', teacherEmail: 'someone@else.com' } });
    const res = await feedback(post('feedback', feedbackBody));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error: string }).error).toContain('AI 설정');
    expect((await feedback(post('feedback', feedbackBody, { 'x-gemini-key': 'AIzaUSERKEY_1234567890abcdef' }))).status).toBe(200);
  });

  it('TEACHER_EMAILS 가 비어 있으면 서버 키를 아무도 못 쓴다', async () => {
    delete process.env.TEACHER_EMAILS;
    installFirestore(student);
    expect((await feedback(post('feedback', feedbackBody))).status).toBe(400);
  });
});

describe('강사님 전용 기능', () => {
  it('키 확인은 강사님만', async () => {
    installFirestore(student);
    expect((await checkKey(post('check-key', {}))).status).toBe(403);
    installFirestore({ cls: { teacherUid: 'T', teacherEmail: TEACHER_EMAIL }, member: { approved: true, role: 'teacher' } });
    expect((await checkKey(post('check-key', {}, { authorization: 'Bearer teacher-token' }))).status).toBe(200);
  });

  it('비밀번호 초기화: 관리자 키가 없으면 안내(501), 로컬 모드에선 400, 토큰 없으면 401', async () => {
    const res = await resetPassword(post('reset-password', { uid: 'S1' }, { authorization: 'Bearer teacher-token' }));
    expect(res.status).toBe(501);
    expect(((await res.json()) as { error: string }).error).toContain('FIREBASE_SERVICE_ACCOUNT');
    expect((await resetPassword(post('reset-password', { uid: 'S1' }, { authorization: '' }))).status).toBe(401);
    delete process.env.VITE_DATA_MODE;
    expect((await resetPassword(post('reset-password', { uid: 'S1' }))).status).toBe(400);
  });
});
