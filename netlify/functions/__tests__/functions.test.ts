// @vitest-environment node
// Netlify Function 단위 테스트 (Gemini 호출은 가짜로 바꿉니다)
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();
vi.mock('@google/genai', () => {
  class ApiError extends Error {
    status: number;
    constructor(o: { message: string; status: number }) {
      super(o.message);
      this.status = o.status;
    }
  }
  class GoogleGenAI {
    models = { generateContent };
    constructor(public opts: { apiKey: string }) {}
  }
  return { ApiError, GoogleGenAI };
});

const { ApiError } = await import('@google/genai');
const feedback = (await import('../feedback')).default;
const tutor = (await import('../tutor')).default;
const checkKey = (await import('../check-key')).default;
const { buildTurns } = await import('../tutor');
const { sanitizeRubric } = await import('../feedback');

const KEY = 'AIzaTESTKEY_1234567890abcdef';
const rubric = [{ name: '줄거리 이해', levels: ['a', 'b', 'c'] }];

function post(name: string, body: unknown, headers: Record<string, string> = { 'x-gemini-key': KEY }): Request {
  return new Request(`http://localhost/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

async function read(res: Response) {
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  generateContent.mockReset();
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_TUTOR_MODEL;
});

describe('feedback 함수', () => {
  it('Gemini JSON 응답을 피드백으로 바꿔 돌려준다', async () => {
    generateContent.mockResolvedValue({ text: '{"praise":"좋아요","improvements":["더 써요"],"rubric":[{"criterion":"줄거리 이해","level":2,"comment":"근거"}],"question":"왜?"}' });
    const { status, body } = await read(await feedback(post('feedback', { assignment: { title: 't', prompt: 'p', rubric, tone: 'coach' }, text: '글' })));
    expect(status).toBe(200);
    expect(body.model).toBe('gemini-3.8-flash');
    expect(body.feedback).toMatchObject({ praise: '좋아요', rubric: [{ criterion: '줄거리 이해', level: 2 }] });
    const call = generateContent.mock.calls[0][0];
    expect(call.model).toBe('gemini-3.8-flash');
    expect(call.config.responseMimeType).toBe('application/json');
    expect(call.contents[0].parts[0].text).toContain('[학생 글 시작]\n글');
  });

  it('글이 4,000자를 넘으면 413 으로 거절하고 Gemini 를 부르지 않는다', async () => {
    const { status, body } = await read(await feedback(post('feedback', { assignment: { rubric }, text: '가'.repeat(4001) })));
    expect(status).toBe(413);
    expect(body.error).toContain('4,000자');
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('본문 전체가 너무 길거나, JSON 이 아니거나, GET 이면 거절한다', async () => {
    expect((await feedback(post('feedback', 'x'.repeat(20001)))).status).toBe(413);
    expect((await feedback(post('feedback', '{oops'))).status).toBe(400);
    expect((await feedback(post('feedback', '[1]'))).status).toBe(400);
    expect((await feedback(new Request('http://localhost/x'))).status).toBe(405);
  });

  it('빈 글·루브릭 없음은 쉬운 말로 거절한다', async () => {
    expect((await read(await feedback(post('feedback', { assignment: { rubric }, text: ' ' })))).body.error).toBe('글을 먼저 써 주세요.');
    expect((await feedback(post('feedback', { assignment: {}, text: '글' }))).status).toBe(400);
  });

  it('API 키가 없으면 안내하고, 환경변수 키가 있으면 그것을 쓴다', async () => {
    const noKey = await read(await feedback(post('feedback', { assignment: { rubric }, text: '글' }, {})));
    expect(noKey.status).toBe(400);
    expect(noKey.body.error).toContain('AI 설정');

    process.env.GEMINI_API_KEY = 'ENV_KEY_abcdefghijklmnopqrstuvwxyz';
    generateContent.mockResolvedValue({ text: '{}' });
    expect((await feedback(post('feedback', { assignment: { rubric }, text: '글' }, {}))).status).toBe(200);
  });

  it('이상한 모양의 키는 거절한다', async () => {
    const res = await read(await feedback(post('feedback', { assignment: { rubric }, text: '글' }, { 'x-gemini-key': 'short' })));
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('모양');
  });

  it('허용 목록에 없는 모델은 기본 모델로 바꾸고, 환경변수 모델도 따른다', async () => {
    generateContent.mockResolvedValue({ text: '{}' });
    await feedback(post('feedback', { assignment: { rubric }, text: '글' }, { 'x-gemini-key': KEY, 'x-gemini-model': 'gpt-5' }));
    expect(generateContent.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    process.env.GEMINI_MODEL = 'gemini-3.5-flash-lite';
    await feedback(post('feedback', { assignment: { rubric }, text: '글' }));
    expect(generateContent.mock.calls[1][0].model).toBe('gemini-3.5-flash-lite');
    await feedback(post('feedback', { assignment: { rubric }, text: '글' }, { 'x-gemini-key': KEY, 'x-gemini-model': 'gemini-3.8-flash' }));
    expect(generateContent.mock.calls[2][0].model).toBe('gemini-3.8-flash');
  });

  it('Gemini 오류는 내부 내용 없이 쉬운 한국어로 바꾼다', async () => {
    const cases: [unknown, number, string][] = [
      [new ApiError({ message: 'API key not valid. secret-detail', status: 400 }), 401, 'API 키가 올바르지 않아요'],
      [new ApiError({ message: 'denied', status: 403 }), 403, '권한'],
      [new ApiError({ message: 'models/x is not found', status: 404 }), 404, '모델'],
      [new ApiError({ message: 'quota', status: 429 }), 429, '잠시 후'],
      [new ApiError({ message: 'bad', status: 400 }), 400, '처리하지 못했어요'],
      [new Error('socket hang up at 10.0.0.1'), 502, '연결'],
    ];
    for (const [err, status, text] of cases) {
      generateContent.mockRejectedValueOnce(err);
      const res = await read(await feedback(post('feedback', { assignment: { rubric }, text: '글' })));
      expect(res.status).toBe(status);
      expect(String(res.body.error)).toContain(text);
      expect(JSON.stringify(res.body)).not.toMatch(/secret-detail|10\.0\.0\.1|AIza/);
    }
  });

  it('Gemini 가 빈 답을 주면 502', async () => {
    generateContent.mockResolvedValue({ text: '' });
    expect((await feedback(post('feedback', { assignment: { rubric }, text: '글' }))).status).toBe(502);
  });

  it('루브릭을 안전하게 정리한다', () => {
    expect(sanitizeRubric('x')).toEqual([]);
    const r = sanitizeRubric([{ name: 'A', levels: ['1'] }, null, { name: '' }, ...Array(6).fill({ name: 'B', levels: [] })]);
    expect(r[0]).toEqual({ name: 'A', levels: ['1', '', ''] });
    expect(r.length).toBe(3); // 앞의 5개까지만 보고, 이름 없는 것은 뺌
  });
});

describe('tutor 함수', () => {
  const room = { topic: '광합성 단원', persona: '과학자', teacherInstruction: '3단원만' };

  it('대화 기록과 함께 튜터 답변을 돌려준다', async () => {
    generateContent.mockResolvedValue({ text: '재료 세 가지를 떠올려 볼래?' });
    const { status, body } = await read(
      await tutor(post('tutor', { room, history: [{ role: 'student', text: '안녕' }, { role: 'tutor', text: '안녕!' }], message: '광합성 식 알려줘' })),
    );
    expect(status).toBe(200);
    expect(body).toEqual({ answer: '재료 세 가지를 떠올려 볼래?', model: 'gemini-3.5-flash-lite' });
    const call = generateContent.mock.calls[0][0];
    expect(call.config.systemInstruction).toContain('정답을 바로 알려주지 않는다');
    expect(call.config.systemInstruction).toContain('3단원만');
    expect(call.contents.map((c: { role: string }) => c.role)).toEqual(['user', 'model', 'user']);
  });

  it('질문 길이 제한과 빈 값', async () => {
    expect((await tutor(post('tutor', { room, message: '가'.repeat(501) }))).status).toBe(413);
    expect((await tutor(post('tutor', { room, message: '' }))).status).toBe(400);
    expect((await tutor(post('tutor', { room: {}, message: '질문' }))).status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('대화 기록 정리: 최근 것만, 첫 순서는 학생, 같은 역할은 합침', () => {
    expect(buildTurns(null, 'q')).toEqual([{ role: 'user', text: 'q' }]);
    const turns = buildTurns(
      [{ role: 'tutor', text: '처음 인사' }, { role: 'student', text: 'a' }, { role: 'student', text: 'b' }, { role: 'tutor', text: 'c' }, 'x'],
      'q',
    );
    expect(turns).toEqual([
      { role: 'user', text: 'a\nb' },
      { role: 'model', text: 'c' },
      { role: 'user', text: 'q' },
    ]);
    const long = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'tutor' : 'student', text: 'x'.repeat(900) }));
    expect(buildTurns(long, 'q').length).toBeLessThanOrEqual(6);
  });
});

describe('check-key 함수', () => {
  it('키가 동작하면 ok', async () => {
    generateContent.mockResolvedValue({ text: '좋아요' });
    expect((await read(await checkKey(post('check-key', {})))).body).toEqual({ ok: true, model: 'gemini-3.8-flash' });
  });
  it('잘못된 키면 401', async () => {
    generateContent.mockRejectedValue(new ApiError({ message: 'API key not valid', status: 400 }));
    expect((await checkKey(post('check-key', {}))).status).toBe(401);
  });
});
