// 로컬 저장소: 모든 데이터를 이 브라우저(localStorage)에 저장합니다. 사진은 IndexedDB.
// 인터넷·Firebase 없이 1단계에서 앱 전체를 체험할 수 있습니다.
// ⚠️ 다른 기기와 공유되지 않으므로 실제 수업에서는 3단계 Firebase 모드를 쓰세요.

import type {
  Assignment,
  ClassRoom,
  CurrentUser,
  KstDate,
  Member,
  Role,
  Routine,
  RoutineLog,
  Submission,
  TutorMessage,
  TutorRoom,
} from '../types';
import { appConfig } from '../config/appConfig';
import { createId, generateClassCode, generateTempPassword, studentEmail } from '../utils/id';
import {
  RepositoryError,
  type AppRepository,
  type ByUserFilter,
  type ResetRequestInput,
  type StudentSignInInput,
  type StudentSignUpInput,
} from './AppRepository';
import { clearPhotos, getPhoto, putPhoto } from './localPhotoStore';
import { buildSampleDb, DEMO_STUDENT_UID, DEMO_TEACHER_UID } from './sampleData';

export interface LocalUser {
  uid: string;
  role: Role;
  name: string;
  email: string;
  passwordHash: string;
}

export interface LocalDb {
  version: 1;
  users: LocalUser[];
  classes: ClassRoom[];
  members: Member[];
  assignments: Assignment[];
  submissions: Submission[];
  routines: Routine[];
  routineLogs: RoutineLog[];
  tutorRooms: TutorRoom[];
  tutorMessages: TutorMessage[];
  aiUsage: Record<string, number>;
}

const DB_KEY = 'classapp:data:v1';
const SESSION_KEY = 'classapp:session';

export function emptyDb(): LocalDb {
  return {
    version: 1,
    users: [],
    classes: [],
    members: [],
    assignments: [],
    submissions: [],
    routines: [],
    routineLogs: [],
    tutorRooms: [],
    tutorMessages: [],
    aiUsage: {},
  };
}

/** 로컬 모드 비밀번호 저장용 (실제 서비스 보안은 3단계 Firebase가 담당) */
export async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`classapp:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function upsert<T>(list: T[], item: T, same: (a: T) => boolean): T[] {
  const index = list.findIndex(same);
  if (index === -1) return [...list, item];
  const copy = [...list];
  copy[index] = item;
  return copy;
}

function byCreatedAt<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt.localeCompare(b.createdAt);
}

export class LocalRepository implements AppRepository {
  constructor(private options: { demo: boolean }) {}

  // ── 저장/불러오기 ──
  private read(): LocalDb {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as LocalDb;
      } catch {
        // 깨진 데이터는 새로 시작
      }
    }
    const db = this.options.demo ? buildSampleDb() : emptyDb();
    this.write(db);
    return db;
  }

  private write(db: LocalDb): void {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  private update(change: (db: LocalDb) => LocalDb): void {
    this.write(change(this.read()));
  }

  private sessionUid(): string | null {
    return localStorage.getItem(SESSION_KEY);
  }

  private toCurrentUser(db: LocalDb, user: LocalUser): CurrentUser {
    if (user.role === 'teacher') {
      const cls = db.classes.find((c) => c.teacherUid === user.uid);
      return { uid: user.uid, role: 'teacher', name: user.name, classId: cls?.id ?? null, approved: true };
    }
    const member = db.members.find((m) => m.uid === user.uid);
    return {
      uid: user.uid,
      role: 'student',
      name: user.name,
      classId: member?.classId ?? null,
      approved: member?.approved ?? false,
    };
  }

  private startSession(db: LocalDb, uid: string): CurrentUser {
    const user = db.users.find((u) => u.uid === uid);
    if (!user) throw new RepositoryError('계정을 찾을 수 없어요.');
    localStorage.setItem(SESSION_KEY, uid);
    return this.toCurrentUser(db, user);
  }

  // ── 로그인 ──
  async getCurrentUser(): Promise<CurrentUser | null> {
    const uid = this.sessionUid();
    if (!uid) return null;
    const db = this.read();
    const user = db.users.find((u) => u.uid === uid);
    return user ? this.toCurrentUser(db, user) : null;
  }

  async signInTeacher(): Promise<CurrentUser> {
    // 로컬 모드에는 Google 로그인이 없으므로 체험용 교사 계정을 씁니다.
    const db = this.read();
    let teacher = db.users.find((u) => u.role === 'teacher');
    if (!teacher) {
      teacher = { uid: 'local-teacher', role: 'teacher', name: '담임 선생님', email: 'teacher@classapp.local', passwordHash: '' };
      db.users.push(teacher);
      this.write(db);
    }
    return this.startSession(db, teacher.uid);
  }

  async signUpStudent(input: StudentSignUpInput): Promise<CurrentUser> {
    const db = this.read();
    const cls = db.classes.find((c) => c.code === input.classCode.trim().toUpperCase());
    if (!cls) throw new RepositoryError('학급 코드를 다시 확인해 주세요.');
    const email = studentEmail(cls.code, input.studentNo);
    if (db.users.some((u) => u.email === email)) {
      throw new RepositoryError('이미 가입한 번호예요. 로그인 화면에서 들어와 주세요.');
    }
    const uid = createId('s-');
    db.users.push({ uid, role: 'student', name: input.name.trim(), email, passwordHash: await hashPassword(input.password) });
    db.members.push({
      uid,
      classId: cls.id,
      role: 'student',
      studentNo: input.studentNo.trim(),
      name: input.name.trim(),
      approved: false,
      joinedAt: new Date().toISOString(),
    });
    this.write(db);
    return this.startSession(db, uid);
  }

  async signInStudent(input: StudentSignInInput): Promise<CurrentUser> {
    const db = this.read();
    const email = studentEmail(input.classCode, input.studentNo);
    const user = db.users.find((u) => u.email === email);
    if (!user || user.passwordHash !== (await hashPassword(input.password))) {
      throw new RepositoryError('학급 코드, 번호, 비밀번호를 다시 확인해 주세요.');
    }
    return this.startSession(db, user.uid);
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY);
  }

  async requestPasswordReset(input: ResetRequestInput): Promise<void> {
    const db = this.read();
    const cls = db.classes.find((c) => c.code === input.classCode.trim().toUpperCase());
    const member = cls && db.members.find((m) => m.classId === cls.id && m.studentNo === input.studentNo.trim());
    if (!member || member.name !== input.name.trim()) {
      throw new RepositoryError('입력한 정보와 같은 학생을 찾지 못했어요.');
    }
    member.resetRequested = true;
    this.write(db);
  }

  async resetStudentPassword(classId: string, uid: string): Promise<string> {
    const db = this.read();
    const user = db.users.find((u) => u.uid === uid);
    const member = db.members.find((m) => m.classId === classId && m.uid === uid);
    if (!user || !member) throw new RepositoryError('학생을 찾을 수 없어요.');
    const temp = generateTempPassword();
    user.passwordHash = await hashPassword(temp);
    member.resetRequested = false;
    this.write(db);
    return temp;
  }

  // ── 데모 ──
  async demoSignIn(role: Role): Promise<CurrentUser> {
    const db = this.read();
    return this.startSession(db, role === 'teacher' ? DEMO_TEACHER_UID : DEMO_STUDENT_UID);
  }

  async resetDemoData(): Promise<void> {
    this.write(buildSampleDb());
    try {
      await clearPhotos();
    } catch {
      // 사진 저장소가 없어도 괜찮아요
    }
  }

  // ── 학급 ──
  async createClass(name: string): Promise<ClassRoom> {
    const uid = this.sessionUid();
    if (!uid) throw new RepositoryError('먼저 로그인해 주세요.');
    const db = this.read();
    let code = generateClassCode();
    while (db.classes.some((c) => c.code === code)) code = generateClassCode();
    const cls: ClassRoom = {
      id: createId('c-'),
      name: name.trim(),
      code,
      teacherUid: uid,
      mode: appConfig.mode,
      enabledModules: (Object.keys(appConfig.modules) as (keyof typeof appConfig.modules)[]).filter((k) => appConfig.modules[k]),
      createdAt: new Date().toISOString(),
    };
    const teacher = db.users.find((u) => u.uid === uid);
    db.classes.push(cls);
    db.members.push({
      uid,
      classId: cls.id,
      role: 'teacher',
      studentNo: '',
      name: teacher?.name ?? '선생님',
      approved: true,
      joinedAt: cls.createdAt,
    });
    this.write(db);
    return cls;
  }

  async getClass(classId: string): Promise<ClassRoom | null> {
    return this.read().classes.find((c) => c.id === classId) ?? null;
  }

  async findClassByCode(code: string): Promise<ClassRoom | null> {
    return this.read().classes.find((c) => c.code === code.trim().toUpperCase()) ?? null;
  }

  // ── 구성원 ──
  async listMembers(classId: string): Promise<Member[]> {
    return this.read()
      .members.filter((m) => m.classId === classId)
      .sort((a, b) => a.studentNo.localeCompare(b.studentNo, 'ko', { numeric: true }));
  }

  async getMember(classId: string, uid: string): Promise<Member | null> {
    return this.read().members.find((m) => m.classId === classId && m.uid === uid) ?? null;
  }

  async approveMember(classId: string, uid: string): Promise<void> {
    this.update((db) => ({
      ...db,
      members: db.members.map((m) => (m.classId === classId && m.uid === uid ? { ...m, approved: true } : m)),
    }));
  }

  async removeMember(classId: string, uid: string): Promise<void> {
    this.update((db) => ({
      ...db,
      members: db.members.filter((m) => !(m.classId === classId && m.uid === uid)),
      users: db.users.filter((u) => u.uid !== uid),
    }));
  }

  // ── 과제 ──
  async listAssignments(classId: string): Promise<Assignment[]> {
    return this.read()
      .assignments.filter((a) => a.classId === classId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAssignment(classId: string, id: string): Promise<Assignment | null> {
    return this.read().assignments.find((a) => a.classId === classId && a.id === id) ?? null;
  }

  async saveAssignment(assignment: Assignment): Promise<void> {
    this.update((db) => ({ ...db, assignments: upsert(db.assignments, assignment, (a) => a.id === assignment.id) }));
  }

  async deleteAssignment(classId: string, id: string): Promise<void> {
    this.update((db) => ({
      ...db,
      assignments: db.assignments.filter((a) => !(a.classId === classId && a.id === id)),
      submissions: db.submissions.filter((s) => !(s.classId === classId && s.assignmentId === id)),
    }));
  }

  async listSubmissions(classId: string, filter: ByUserFilter & { assignmentId?: string } = {}): Promise<Submission[]> {
    return this.read().submissions.filter(
      (s) =>
        s.classId === classId &&
        (filter.uid === undefined || s.uid === filter.uid) &&
        (filter.assignmentId === undefined || s.assignmentId === filter.assignmentId),
    );
  }

  async saveSubmission(submission: Submission): Promise<void> {
    this.update((db) => ({ ...db, submissions: upsert(db.submissions, submission, (s) => s.id === submission.id) }));
  }

  // ── 루틴 ──
  async listRoutines(classId: string): Promise<Routine[]> {
    return this.read().routines.filter((r) => r.classId === classId).sort(byCreatedAt);
  }

  async saveRoutine(routine: Routine): Promise<void> {
    this.update((db) => ({ ...db, routines: upsert(db.routines, routine, (r) => r.id === routine.id) }));
  }

  async deleteRoutine(classId: string, id: string): Promise<void> {
    this.update((db) => ({
      ...db,
      routines: db.routines.filter((r) => !(r.classId === classId && r.id === id)),
      routineLogs: db.routineLogs.filter((l) => !(l.classId === classId && l.routineId === id)),
    }));
  }

  async listRoutineLogs(classId: string, filter: ByUserFilter & { routineId?: string } = {}): Promise<RoutineLog[]> {
    return this.read().routineLogs.filter(
      (l) =>
        l.classId === classId &&
        (filter.uid === undefined || l.uid === filter.uid) &&
        (filter.routineId === undefined || l.routineId === filter.routineId),
    );
  }

  async saveRoutineLog(log: RoutineLog): Promise<void> {
    this.update((db) => ({ ...db, routineLogs: upsert(db.routineLogs, log, (l) => l.id === log.id) }));
  }

  async uploadPhoto(_classId: string, _uid: string, file: Blob): Promise<string> {
    const id = createId('p-');
    await putPhoto(id, file);
    return `idb:${id}`;
  }

  async resolvePhotoUrl(url: string): Promise<string> {
    if (!url.startsWith('idb:')) return url;
    const blob = await getPhoto(url.slice(4));
    if (!blob) throw new RepositoryError('사진을 찾을 수 없어요.');
    return URL.createObjectURL(blob);
  }

  // ── 튜터 ──
  async listTutorRooms(classId: string): Promise<TutorRoom[]> {
    return this.read().tutorRooms.filter((r) => r.classId === classId).sort(byCreatedAt);
  }

  async saveTutorRoom(room: TutorRoom): Promise<void> {
    this.update((db) => ({ ...db, tutorRooms: upsert(db.tutorRooms, room, (r) => r.id === room.id) }));
  }

  async deleteTutorRoom(classId: string, id: string): Promise<void> {
    this.update((db) => ({
      ...db,
      tutorRooms: db.tutorRooms.filter((r) => !(r.classId === classId && r.id === id)),
      tutorMessages: db.tutorMessages.filter((m) => !(m.classId === classId && m.roomId === id)),
    }));
  }

  async listTutorMessages(classId: string, filter: ByUserFilter & { roomId?: string } = {}): Promise<TutorMessage[]> {
    return this.read()
      .tutorMessages.filter(
        (m) =>
          m.classId === classId &&
          (filter.uid === undefined || m.uid === filter.uid) &&
          (filter.roomId === undefined || m.roomId === filter.roomId),
      )
      .sort(byCreatedAt);
  }

  async addTutorMessage(message: TutorMessage): Promise<void> {
    this.update((db) => ({ ...db, tutorMessages: [...db.tutorMessages, message] }));
  }

  // ── AI 사용량 ──
  async getAiUsage(classId: string, uid: string, date: KstDate): Promise<number> {
    return this.read().aiUsage[`${classId}_${uid}_${date}`] ?? 0;
  }

  async incrementAiUsage(classId: string, uid: string, date: KstDate): Promise<number> {
    const key = `${classId}_${uid}_${date}`;
    const db = this.read();
    const next = (db.aiUsage[key] ?? 0) + 1;
    db.aiUsage[key] = next;
    this.write(db);
    return next;
  }
}
