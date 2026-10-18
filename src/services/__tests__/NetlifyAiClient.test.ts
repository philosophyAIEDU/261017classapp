import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetlifyAiClient } from '../NetlifyAiClient';

const rubric = [{ name: '이해', levels: ['1', '2', '3'] as [string, string, string] }];
const assignment = { title: 't', prompt: 'p', rubric, tone: 'coach' as const, minChars: 1, maxChars: 100 };
const room = { topic: 'a', persona: 'b', teacherInstruction: '' };

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('NetlifyAiClient', () => {
  const client = new NetlifyAiClient((purpose) => ({ apiKey: 'AIzaKEY', model: purpose === 'tutor' ? 'gemini-3.5-flash-lite' : 'gemini-3.8-flash' }));

  it('키·모델을 헤더로 보내고 피드백을 파싱한다', async () => {
    const fn = mockFetch(200, { feedback: { praise: '굿' } });
    const fb = await client.getFeedback({ assignment, text: '글' });
    expect(fb.praise).toBe('굿');
    expect(fb.rubric[0].criterion).toBe('이해');
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('/.netlify/functions/feedback');
    expect(init.headers['X-Gemini-Key']).toBe('AIzaKEY');
    expect(init.headers['X-Gemini-Model']).toBe('gemini-3.8-flash');
  });

  it('튜터 답변과 오류 메시지', async () => {
    const fn = mockFetch(200, { answer: '힌트' });
    expect(await client.askTutor({ room, history: [], message: 'q' })).toBe('힌트');
    expect(fn.mock.calls[0][1].headers['X-Gemini-Model']).toBe('gemini-3.5-flash-lite');
    mockFetch(200, { answer: '' });
    await expect(client.askTutor({ room, history: [], message: 'q' })).rejects.toThrow('답을 만들지');
    mockFetch(429, { error: '잠시 후 다시 해 주세요.' });
    await expect(client.getFeedback({ assignment, text: '글' })).rejects.toThrow('잠시 후 다시 해 주세요.');
    mockFetch(404, 'Not Found');
    await expect(client.getFeedback({ assignment, text: '글' })).rejects.toThrow('netlify dev');
    mockFetch(500, 'oops');
    await expect(client.getFeedback({ assignment, text: '글' })).rejects.toThrow('잠깐 쉬고');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed')));
    await expect(client.checkKey()).rejects.toThrow('인터넷');
  });

  it('키가 없으면 키 헤더를 보내지 않는다', async () => {
    const fn = mockFetch(200, { ok: true, model: 'gemini-3.8-flash' });
    const noKey = new NetlifyAiClient(() => ({ apiKey: '', model: 'gemini-3.8-flash' }));
    expect(await noKey.checkKey()).toBe('gemini-3.8-flash');
    expect(fn.mock.calls[0][1].headers['X-Gemini-Key']).toBeUndefined();
  });
});
