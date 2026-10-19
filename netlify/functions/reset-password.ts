// 수강생 비밀번호 초기화 함수: 강사님이 [임시 비밀번호 만들기]를 누르면 부릅니다.
// 주소: POST /.netlify/functions/reset-password   (Firebase 모드 전용)
// ⚠️ 남의 비밀번호를 바꾸는 일이라 관리자 권한(FIREBASE_SERVICE_ACCOUNT 환경변수)이 필요합니다. 설정 방법: docs/setup-firebase.md

import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { terms } from '../../src/config/appConfig';
import { generateTempPassword } from '../../src/utils/id';
import { adminApp, hasAdminCredentials, isFirebaseMode, verifyUser } from './_shared/firebaseAdmin';
import { asString, errorResponse, FriendlyError, json, readJsonBody } from './_shared/http';

export default async function handler(req: Request): Promise<Response> {
  try {
    const body = await readJsonBody(req);
    if (!isFirebaseMode()) throw new FriendlyError(400, 'Firebase 모드에서만 쓰는 기능이에요.');
    const { user } = await verifyUser(req);
    if (!hasAdminCredentials()) {
      throw new FriendlyError(501, '비밀번호 초기화를 쓰려면 Netlify 환경변수 FIREBASE_SERVICE_ACCOUNT 설정이 필요해요. (docs/setup-firebase.md 참고)');
    }
    const classId = asString(body.classId).trim();
    const uid = asString(body.uid).trim();
    if (!classId || !uid) throw new FriendlyError(400, '잘못된 요청이에요.');

    const firestore = getFirestore(adminApp());
    const cls = await firestore.doc(`classes/${classId}`).get();
    if (!cls.exists || cls.get('teacherUid') !== user.uid) throw new FriendlyError(403, `${terms.teacher}만 비밀번호를 초기화할 수 있어요.`);
    const member = await firestore.doc(`classes/${classId}/members/${uid}`).get();
    if (!member.exists || member.get('role') !== 'student') throw new FriendlyError(404, `${terms.student}을 찾을 수 없어요.`);

    const tempPassword = generateTempPassword();
    await getAuth(adminApp()).updateUser(uid, { password: tempPassword });

    // 처리한 초기화 요청은 지웁니다.
    const requests = await firestore.collection(`classes/${classId}/resetRequests`).where('studentNo', '==', member.get('studentNo')).get();
    await Promise.all(requests.docs.map((d) => d.ref.delete()));

    return json(200, { tempPassword });
  } catch (error) {
    return errorResponse(error);
  }
}
