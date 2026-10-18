// Netlify Function 공통 도우미: 응답 만들기, 요청 본문 읽기(길이 제한), 쉬운 한국어 오류.
// 🔒 학생에게는 쉬운 문장만 보내고, 내부 오류 내용(스택, API 응답 원문, 키)은 절대 보내지 않습니다.

/** 요청 본문 전체 최대 글자 수 (학생 글 4,000자 + 루브릭·대화 기록 여유분) */
export const MAX_BODY_CHARS = 20000;

export class FriendlyError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  if (req.method !== 'POST') throw new FriendlyError(405, '잘못된 요청이에요.');
  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) throw new FriendlyError(413, '글이 너무 길어요. 조금 줄여서 다시 보내 주세요.');
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('not object');
    return data as Record<string, unknown>;
  } catch {
    throw new FriendlyError(400, '잘못된 요청이에요.');
  }
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 함수 안에서 생긴 오류 → 학생용 응답. 알 수 없는 오류는 서버 로그에만 남깁니다. */
export function errorResponse(error: unknown): Response {
  if (error instanceof FriendlyError) return json(error.status, { error: error.message });
  console.error('[function error]', error instanceof Error ? error.name : 'unknown');
  return json(500, { error: 'AI 선생님이 잠깐 쉬고 있어요. 잠시 후 다시 시도해 주세요.' });
}
