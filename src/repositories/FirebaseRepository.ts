// Firebase 저장소: 데이터를 온라인(Firestore)에 저장해서 강사님과 수강생이 각자 기기에서 함께 씁니다.
// 화면은 LocalRepository 와 똑같은 약속(AppRepository)으로 이 파일을 씁니다.
// 데이터 구조는 docs/firebase-structure.md, 누가 무엇을 읽고 쓸 수 있는지는 firestore.rules 에 있어요.

import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import { appConfig, terms } from '../config/appConfig';
import { auth, db } from '../services/firebase';
import type { Assignment, ClassRoom, CurrentUser, KstDate, Member, Routine, RoutineLog, Submission, TutorMessage, TutorRoom } from '../types';
import { createId, generateClassCode, studentEmail } from '../utils/id';
import {
  RepositoryError,
  type AppRepository,
  type ByUserFilter,
  type ResetRequestInput,
  type StudentSignInInput,
  type StudentSignUpInput,
} from './AppRepository';

/** users/{uid}: 로그인한 사람이 누구인지(역할·소속) */
interface UserDoc {
  uid: string;
  role: 'teacher' | 'student';
  name: string;
  email: string;
  classId: string | null;
}

/** 사진을 Firestore 에 직접 저장할 때 최대 크기 (Firestore 문서 1개는 1MB까지) */
const MAX_PHOTO_DATA_URL = 700_000;

function friendlyAuthError(error: unknown): RepositoryError {
  const code = error instanceof FirebaseError ? error.code : '';
  switch (code) {
    case 'auth/email-already-in-use':
      return new RepositoryError('이미 가입한 번호예요. 로그인 화면에서 들어와 주세요.');
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new RepositoryError(`${terms.code}, 번호, 비밀번호를 다시 확인해 주세요.`);
    case 'auth/weak-password':
      return new RepositoryError('비밀번호는 6자 이상으로 정해 주세요.');
    case 'auth/too-many-requests':
      return new RepositoryError('여러 번 틀렸어요. 잠시 후 다시 시도해 주세요.');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new RepositoryError('로그인 창이 닫혔어요. 다시 눌러 주세요.');
    case 'auth/unauthorized-domain':
      return new RepositoryError('이 주소에서는 로그인이 아직 허용되지 않았어요. Firebase 콘솔 → Authentication → 설정 → 승인된 도메인에 이 주소를 추가해 주세요.');
    case 'auth/operation-not-allowed':
      return new RepositoryError('Firebase 콘솔에서 이 로그인 방법(Google 또는 이메일/비밀번호)이 아직 켜져 있지 않아요.');
    case 'auth/network-request-failed':
      return new RepositoryError('인터넷 연결을 확인해 주세요.');
    default:
      return new RepositoryError('로그인 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
  }
}

/** Firestore 오류를 쉬운 말로 */
async function guard<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    const code = error instanceof FirebaseError ? error.code : '';
    if (code === 'permission-denied') throw new RepositoryError('이 내용을 볼 수 있는 권한이 없어요. 승인을 기다리는 중이거나, 로그인이 풀렸을 수 있어요.');
    if (code === 'unavailable') throw new RepositoryError('인터넷 연결이 불안정해요. 잠시 후 다시 시도해 주세요.');
    throw new RepositoryError('잠시 문제가 생겼어요. 다시 시도해 주세요.');
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export class FirebaseRepository implements AppRepository {
  // ── 경로 도우미 ──
  private sub(classId: string, name: string) {
    return collection(db, 'classes', classId, name);
  }

  private async listOf<T>(classId: string, name: string, constraints: QueryConstraint[] = []): Promise<T[]> {
    const snap = await getDocs(constraints.length ? query(this.sub(classId, name), ...constraints) : this.sub(classId, name));
    return snap.docs.map((d) => d.data() as T);
  }

  /** { uid: 'a', roomId: undefined } → where('uid', '==', 'a') (값이 있는 항목만) */
  private userFilter(filter: { [key: string]: string | undefined }): QueryConstraint[] {
    return Object.entries(filter)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => where(k, '==', v));
  }

  private async toCurrentUser(u: UserDoc): Promise<CurrentUser> {
    if (u.role === 'teacher') return { uid: u.uid, role: 'teacher', name: u.name, classId: u.classId, approved: true };
    let approved = false;
    if (u.classId) {
      const m = await getDoc(doc(db, 'classes', u.classId, 'members', u.uid)).catch(() => null);
      approved = m?.exists() ? (m.data() as Member).approved : false;
    }
    return { uid: u.uid, role: 'student', name: u.name, classId: u.classId, approved };
  }

  // ── 로그인 ──
  async getIdToken(): Promise<string | null> {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  }

  async getCurrentUser(): Promise<CurrentUser | null> {
    await auth.authStateReady();
    const fbUser = auth.currentUser;
    if (!fbUser) return null;
    return guard(async () => {
      const ref = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return this.toCurrentUser(snap.data() as UserDoc);
      // Google 로 처음 들어온 사람 → 강사님 계정으로 만들기
      const isGoogle = fbUser.providerData.some((p) => p.providerId === 'google.com');
      if (!isGoogle) return null;
      const u: UserDoc = { uid: fbUser.uid, role: 'teacher', name: fbUser.displayName ?? terms.teacher, email: fbUser.email ?? '', classId: null };
      await setDoc(ref, u);
      return this.toCurrentUser(u);
    });
  }

  async signInTeacher(): Promise<CurrentUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      // 휴대폰·앱 안 브라우저에서 팝업이 막히면 페이지 이동 방식으로 다시 시도
      if (error instanceof FirebaseError && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
        await signInWithRedirect(auth, provider);
        throw new RepositoryError('Google 로그인 화면으로 이동하고 있어요…');
      }
      throw friendlyAuthError(error);
    }
    const user = await this.getCurrentUser();
    if (!user) throw new RepositoryError('로그인 정보를 불러오지 못했어요. 다시 시도해 주세요.');
    if (user.role !== 'teacher') {
      await fbSignOut(auth);
      throw new RepositoryError(`이 계정은 ${terms.student} 계정이에요. ${terms.student} 로그인 화면을 이용해 주세요.`);
    }
    return user;
  }

  async signUpStudent(input: StudentSignUpInput): Promise<CurrentUser> {
    const code = input.classCode.trim().toUpperCase();
    const codeSnap = await guard(() => getDoc(doc(db, 'classCodes', code)));
    if (!codeSnap.exists()) throw new RepositoryError(`${terms.code}를 다시 확인해 주세요.`);
    const classId = (codeSnap.data() as { classId: string }).classId;

    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, studentEmail(code, input.studentNo), input.password);
      uid = cred.user.uid;
    } catch (error) {
      throw friendlyAuthError(error);
    }
    const name = input.name.trim();
    await guard(async () => {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid), { uid, role: 'student', name, email: '', classId } satisfies UserDoc);
      batch.set(doc(db, 'classes', classId, 'members', uid), {
        uid,
        classId,
        role: 'student',
        studentNo: input.studentNo.trim(),
        name,
        approved: false,
        joinedAt: new Date().toISOString(),
      } satisfies Member);
      await batch.commit();
    });
    return { uid, role: 'student', name, classId, approved: false };
  }

  async signInStudent(input: StudentSignInInput): Promise<CurrentUser> {
    try {
      await signInWithEmailAndPassword(auth, studentEmail(input.classCode, input.studentNo), input.password);
    } catch (error) {
      throw friendlyAuthError(error);
    }
    const user = await this.getCurrentUser();
    if (!user) throw new RepositoryError('가입 정보를 찾지 못했어요. 처음부터 다시 가입해 주세요.');
    return user;
  }

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  }

  async requestPasswordReset(input: ResetRequestInput): Promise<void> {
    const code = input.classCode.trim().toUpperCase();
    await guard(async () => {
      const codeSnap = await getDoc(doc(db, 'classCodes', code));
      if (!codeSnap.exists()) throw new RepositoryError(`${terms.code}를 다시 확인해 주세요.`);
      const classId = (codeSnap.data() as { classId: string }).classId;
      await setDoc(doc(this.sub(classId, 'resetRequests'), createId('rr-')), {
        studentNo: input.studentNo.trim(),
        name: input.name.trim(),
        createdAt: new Date().toISOString(),
      });
    });
  }

  async resetStudentPassword(classId: string, uid: string): Promise<string> {
    // 다른 사람의 비밀번호는 브라우저에서 바꿀 수 없어서 서버 함수가 대신 바꿉니다.
    const token = await this.getIdToken();
    let response: Response;
    try {
      response = await fetch('/.netlify/functions/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ classId, uid }),
      });
    } catch {
      throw new RepositoryError('인터넷 연결을 확인해 주세요.');
    }
    const data = (await response.json().catch(() => ({}))) as { tempPassword?: string; error?: string };
    if (!response.ok || !data.tempPassword) throw new RepositoryError(data.error ?? '비밀번호를 초기화하지 못했어요. (서버 함수가 켜져 있는지 확인해 주세요)');
    return data.tempPassword;
  }

  // ── 학급(클래스) ──
  async createClass(name: string): Promise<ClassRoom> {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new RepositoryError('먼저 로그인해 주세요.');
    return guard(async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = generateClassCode();
        if ((await getDoc(doc(db, 'classCodes', code))).exists()) continue;
        const cls: ClassRoom & { teacherEmail: string } = {
          id: createId('c-'),
          name: name.trim(),
          code,
          teacherUid: fbUser.uid,
          teacherEmail: fbUser.email ?? '',
          mode: appConfig.mode,
          enabledModules: (Object.keys(appConfig.modules) as (keyof typeof appConfig.modules)[]).filter((k) => appConfig.modules[k]),
          createdAt: new Date().toISOString(),
        };
        const batch = writeBatch(db);
        batch.set(doc(db, 'classes', cls.id), cls);
        batch.set(doc(db, 'classCodes', code), { classId: cls.id, teacherUid: fbUser.uid });
        batch.set(doc(db, 'classes', cls.id, 'members', fbUser.uid), {
          uid: fbUser.uid,
          classId: cls.id,
          role: 'teacher',
          studentNo: '',
          name: fbUser.displayName ?? terms.teacher,
          approved: true,
          joinedAt: cls.createdAt,
        } satisfies Member);
        batch.update(doc(db, 'users', fbUser.uid), { classId: cls.id });
        await batch.commit();
        return cls;
      }
      throw new RepositoryError('코드를 만들지 못했어요. 다시 시도해 주세요.');
    });
  }

  async getClass(classId: string): Promise<ClassRoom | null> {
    return guard(async () => {
      const snap = await getDoc(doc(db, 'classes', classId));
      return snap.exists() ? (snap.data() as ClassRoom) : null;
    });
  }

  async findClassByCode(code: string): Promise<ClassRoom | null> {
    return guard(async () => {
      const snap = await getDoc(doc(db, 'classCodes', code.trim().toUpperCase()));
      return snap.exists() ? this.getClass((snap.data() as { classId: string }).classId) : null;
    });
  }

  // ── 구성원 ──
  async listMembers(classId: string): Promise<Member[]> {
    return guard(async () => {
      const [members, resets] = await Promise.all([
        this.listOf<Member>(classId, 'members'),
        this.listOf<{ studentNo: string; name: string }>(classId, 'resetRequests').catch(() => []),
      ]);
      return members
        .map((m) => (resets.some((r) => r.studentNo === m.studentNo && r.name === m.name) ? { ...m, resetRequested: true } : m))
        .sort((a, b) => a.studentNo.localeCompare(b.studentNo, 'ko', { numeric: true }));
    });
  }

  async getMember(classId: string, uid: string): Promise<Member | null> {
    return guard(async () => {
      const snap = await getDoc(doc(db, 'classes', classId, 'members', uid));
      return snap.exists() ? (snap.data() as Member) : null;
    });
  }

  async approveMember(classId: string, uid: string): Promise<void> {
    await guard(() => updateDoc(doc(db, 'classes', classId, 'members', uid), { approved: true }));
  }

  async removeMember(classId: string, uid: string): Promise<void> {
    await guard(() => deleteDoc(doc(db, 'classes', classId, 'members', uid)));
  }

  // ── 과제 ──
  async listAssignments(classId: string): Promise<Assignment[]> {
    return guard(async () => (await this.listOf<Assignment>(classId, 'assignments')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async getAssignment(classId: string, id: string): Promise<Assignment | null> {
    return guard(async () => {
      const snap = await getDoc(doc(db, 'classes', classId, 'assignments', id));
      return snap.exists() ? (snap.data() as Assignment) : null;
    });
  }

  async saveAssignment(assignment: Assignment): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', assignment.classId, 'assignments', assignment.id), assignment as unknown as DocumentData));
  }

  async deleteAssignment(classId: string, id: string): Promise<void> {
    await guard(async () => {
      const subs = await getDocs(query(this.sub(classId, 'submissions'), where('assignmentId', '==', id)));
      const batch = writeBatch(db);
      subs.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'classes', classId, 'assignments', id));
      await batch.commit();
    });
  }

  async listSubmissions(classId: string, filter: ByUserFilter & { assignmentId?: string } = {}): Promise<Submission[]> {
    return guard(() => this.listOf<Submission>(classId, 'submissions', this.userFilter({ ...filter })));
  }

  async saveSubmission(submission: Submission): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', submission.classId, 'submissions', submission.id), submission as unknown as DocumentData));
  }

  // ── 루틴 ──
  async listRoutines(classId: string): Promise<Routine[]> {
    return guard(async () => (await this.listOf<Routine>(classId, 'routines')).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }

  async saveRoutine(routine: Routine): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', routine.classId, 'routines', routine.id), routine as unknown as DocumentData));
  }

  async deleteRoutine(classId: string, id: string): Promise<void> {
    await guard(async () => {
      const logs = await getDocs(query(this.sub(classId, 'routineLogs'), where('routineId', '==', id)));
      const batch = writeBatch(db);
      logs.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'classes', classId, 'routines', id));
      await batch.commit();
    });
  }

  async listRoutineLogs(classId: string, filter: ByUserFilter & { routineId?: string } = {}): Promise<RoutineLog[]> {
    return guard(() => this.listOf<RoutineLog>(classId, 'routineLogs', this.userFilter({ ...filter })));
  }

  async saveRoutineLog(log: RoutineLog): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', log.classId, 'routineLogs', log.id), log as unknown as DocumentData));
  }

  async uploadPhoto(classId: string, uid: string, file: Blob): Promise<string> {
    const dataUrl = await blobToDataUrl(file);
    if (dataUrl.length > MAX_PHOTO_DATA_URL) throw new RepositoryError('사진이 너무 커요. 다른 사진으로 해 볼까요?');
    const id = createId('p-');
    await guard(() => setDoc(doc(db, 'classes', classId, 'photos', id), { uid, dataUrl, createdAt: new Date().toISOString() }));
    return `fs:${classId}/${id}`;
  }

  async resolvePhotoUrl(url: string): Promise<string> {
    if (!url.startsWith('fs:')) return url;
    const [classId, id] = url.slice(3).split('/');
    return guard(async () => {
      const snap = await getDoc(doc(db, 'classes', classId, 'photos', id));
      if (!snap.exists()) throw new RepositoryError('사진을 찾을 수 없어요.');
      return (snap.data() as { dataUrl: string }).dataUrl;
    });
  }

  // ── 튜터 ──
  async listTutorRooms(classId: string): Promise<TutorRoom[]> {
    return guard(async () => (await this.listOf<TutorRoom>(classId, 'tutorRooms')).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }

  async saveTutorRoom(room: TutorRoom): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', room.classId, 'tutorRooms', room.id), room as unknown as DocumentData));
  }

  async deleteTutorRoom(classId: string, id: string): Promise<void> {
    await guard(async () => {
      const msgs = await getDocs(query(this.sub(classId, 'tutorMessages'), where('roomId', '==', id)));
      const batch = writeBatch(db);
      msgs.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'classes', classId, 'tutorRooms', id));
      await batch.commit();
    });
  }

  async listTutorMessages(classId: string, filter: ByUserFilter & { roomId?: string } = {}): Promise<TutorMessage[]> {
    return guard(async () => (await this.listOf<TutorMessage>(classId, 'tutorMessages', this.userFilter({ ...filter }))).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  }

  async addTutorMessage(message: TutorMessage): Promise<void> {
    await guard(() => setDoc(doc(db, 'classes', message.classId, 'tutorMessages', message.id), message as unknown as DocumentData));
  }

  // ── AI 사용량 ──
  // Firebase 모드에서는 서버 함수가 진짜 AI를 부를 때마다 횟수를 세고 제한합니다. 화면은 읽기만 해요.
  async getAiUsage(classId: string, uid: string, date: KstDate): Promise<number> {
    const snap = await getDoc(doc(db, 'classes', classId, 'aiUsage', `${uid}_${date}`)).catch(() => null);
    return snap?.exists() ? Number((snap.data() as { tutor?: number }).tutor ?? 0) : 0;
  }

  async incrementAiUsage(classId: string, uid: string, date: KstDate): Promise<number> {
    return (await this.getAiUsage(classId, uid, date)) + 1;
  }
}
