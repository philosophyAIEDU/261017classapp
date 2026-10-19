// 서버가 "로그인한 그 사람의 토큰"으로 Firestore 를 읽고 씁니다. (Firestore REST API)
// 그래서 서버도 firestore.rules 를 똑같이 지켜야 하고, 관리자 키(서비스 계정)가 없어도 동작합니다.

import { firebaseProjectId } from './firebaseAdmin';
import { FriendlyError } from './http';

type FirestoreValue = { stringValue?: string; booleanValue?: boolean; integerValue?: string; nullValue?: null; doubleValue?: number };
export type PlainDoc = Record<string, string | boolean | number | null>;

function base(): string {
  return `https://firestore.googleapis.com/v1/projects/${firebaseProjectId()}/databases/(default)/documents`;
}

function toPlain(fields: Record<string, FirestoreValue> | undefined): PlainDoc {
  const out: PlainDoc = {};
  for (const [key, v] of Object.entries(fields ?? {})) {
    if (v.stringValue !== undefined) out[key] = v.stringValue;
    else if (v.booleanValue !== undefined) out[key] = v.booleanValue;
    else if (v.integerValue !== undefined) out[key] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[key] = v.doubleValue;
    else out[key] = null;
  }
  return out;
}

/** 문서 하나 읽기. 없거나 읽을 권한이 없으면 null */
export async function getDocAs(token: string, path: string): Promise<PlainDoc | null> {
  let res: Response;
  try {
    res = await fetch(`${base()}/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new FriendlyError(502, '데이터베이스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new FriendlyError(502, '데이터베이스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const data = (await res.json()) as { fields?: Record<string, FirestoreValue> };
  return toPlain(data.fields);
}

export interface CounterWrite {
  /** documents/ 뒤의 경로. 예) classes/c1/aiUsage/u1_2026-10-19 */
  path: string;
  /** 함께 저장할 글자 값 (예: uid, date) */
  fields: Record<string, string>;
  /** 늘릴 숫자 항목과 늘릴 양 (예: { count: 1, tutor: 0 }) */
  increments: Record<string, number>;
}

/**
 * 여러 카운터를 한 번에 +1 하고, 늘어난 뒤의 값을 돌려줍니다. (모두 성공하거나 모두 실패)
 * firestore.rules 가 "정확히 1씩만 늘리기"를 강제하므로 학생이 직접 숫자를 줄일 수 없어요.
 */
export async function incrementCounters(token: string, writes: CounterWrite[]): Promise<Record<string, number>[]> {
  const root = `projects/${firebaseProjectId()}/databases/(default)/documents`;
  const body = {
    writes: writes.map((w) => ({
      update: { name: `${root}/${w.path}`, fields: Object.fromEntries(Object.entries(w.fields).map(([k, v]) => [k, { stringValue: v }])) },
      updateMask: { fieldPaths: Object.keys(w.fields) },
      updateTransforms: Object.entries(w.increments).map(([fieldPath, n]) => ({ fieldPath, increment: { integerValue: String(n) } })),
    })),
  };
  let res: Response;
  try {
    res = await fetch(`${base()}:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new FriendlyError(502, '데이터베이스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  if (res.status === 403) throw new FriendlyError(403, '사용 기록을 남길 권한이 없어요. 승인된 계정인지, 최신 firestore.rules 를 게시했는지 확인해 주세요.');
  if (!res.ok) throw new FriendlyError(502, '데이터베이스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
  const data = (await res.json()) as { writeResults?: { transformResults?: FirestoreValue[] }[] };
  return writes.map((w, i) => {
    const results = data.writeResults?.[i]?.transformResults ?? [];
    return Object.fromEntries(Object.keys(w.increments).map((k, j) => [k, Number(results[j]?.integerValue ?? 0)]));
  });
}
