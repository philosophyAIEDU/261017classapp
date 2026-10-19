// 서버에서 Firebase 로그인 토큰을 확인합니다. (firebase-admin)
// - 토큰 확인(verifyIdToken)은 프로젝트 ID만 있으면 됩니다.
// - 비밀번호 초기화처럼 "관리자 권한"이 필요한 일은 FIREBASE_SERVICE_ACCOUNT 환경변수(서비스 계정 키)가 있어야 해요.

import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { firebaseConfig } from '../../../src/config/firebaseConfig';
import { FriendlyError } from './http';

/** 화면과 서버가 같은 값을 봅니다: VITE_DATA_MODE=firebase 이면 모든 AI 요청에 로그인 확인을 합니다. */
export function isFirebaseMode(): boolean {
  return process.env.VITE_DATA_MODE === 'firebase';
}

export function firebaseProjectId(): string {
  return process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;
}

/** 서비스 계정 키(JSON 그대로 또는 base64) → 객체. 없으면 null */
export function readServiceAccount(): { project_id?: string; client_email: string; private_key: string } | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const parsed = JSON.parse(text) as { project_id?: string; client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) return null;
    return { project_id: parsed.project_id, client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

export function hasAdminCredentials(): boolean {
  return readServiceAccount() !== null;
}

export function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const account = readServiceAccount();
  const projectId = firebaseProjectId();
  return account
    ? initializeApp({ credential: cert({ projectId: account.project_id ?? projectId, clientEmail: account.client_email, privateKey: account.private_key }), projectId })
    : initializeApp({ projectId });
}

/** Authorization: Bearer <토큰> → 로그인한 사람 정보. 없거나 틀리면 401 */
export function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match || !match[1].trim()) throw new FriendlyError(401, '로그인이 필요해요. 다시 로그인해 주세요.');
  return match[1].trim();
}

export async function verifyUser(req: Request): Promise<{ token: string; user: DecodedIdToken }> {
  const token = bearerToken(req);
  try {
    const user = await getAuth(adminApp()).verifyIdToken(token);
    return { token, user };
  } catch {
    throw new FriendlyError(401, '로그인이 만료되었어요. 다시 로그인해 주세요.');
  }
}
