// 데이터 계층의 "약속(인터페이스)"입니다.
// 화면은 이 약속만 알고, 실제 저장 위치(브라우저 / Firebase)는 repositories/index.ts 가 고릅니다.
// 모든 메서드는 Promise 를 돌려줍니다(=시간이 걸릴 수 있는 작업).

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

export interface StudentSignUpInput {
  classCode: string;
  studentNo: string;
  name: string;
  password: string;
}

export interface StudentSignInInput {
  classCode: string;
  studentNo: string;
  password: string;
}

export interface ResetRequestInput {
  classCode: string;
  studentNo: string;
  name: string;
}

export interface ByUserFilter {
  uid?: string;
}

/** 화면에 그대로 보여 줘도 되는 쉬운 오류 */
export class RepositoryError extends Error {}

export interface AppRepository {
  // ── 로그인 ──
  getCurrentUser(): Promise<CurrentUser | null>;
  signInTeacher(): Promise<CurrentUser>;
  signUpStudent(input: StudentSignUpInput): Promise<CurrentUser>;
  signInStudent(input: StudentSignInInput): Promise<CurrentUser>;
  signOut(): Promise<void>;
  requestPasswordReset(input: ResetRequestInput): Promise<void>;
  /** 교사가 학생 비밀번호를 초기화하고 임시 비밀번호를 받습니다. */
  resetStudentPassword(classId: string, uid: string): Promise<string>;

  /** 서버(Netlify Function)에 "누가 보냈는지" 증명하는 로그인 토큰 (Firebase 모드에서만 있음) */
  getIdToken?(): Promise<string | null>;

  // ── 데모 모드 전용 (로컬 저장에서만 있음) ──
  demoSignIn?(role: Role): Promise<CurrentUser>;
  resetDemoData?(): Promise<void>;

  // ── 학급 ──
  createClass(name: string): Promise<ClassRoom>;
  getClass(classId: string): Promise<ClassRoom | null>;
  findClassByCode(code: string): Promise<ClassRoom | null>;

  // ── 구성원 ──
  listMembers(classId: string): Promise<Member[]>;
  getMember(classId: string, uid: string): Promise<Member | null>;
  approveMember(classId: string, uid: string): Promise<void>;
  removeMember(classId: string, uid: string): Promise<void>;

  // ── 과제 · 제출물 ──
  listAssignments(classId: string): Promise<Assignment[]>;
  getAssignment(classId: string, id: string): Promise<Assignment | null>;
  saveAssignment(assignment: Assignment): Promise<void>;
  deleteAssignment(classId: string, id: string): Promise<void>;
  listSubmissions(classId: string, filter?: ByUserFilter & { assignmentId?: string }): Promise<Submission[]>;
  saveSubmission(submission: Submission): Promise<void>;

  // ── 루틴 ──
  listRoutines(classId: string): Promise<Routine[]>;
  saveRoutine(routine: Routine): Promise<void>;
  deleteRoutine(classId: string, id: string): Promise<void>;
  listRoutineLogs(classId: string, filter?: ByUserFilter & { routineId?: string }): Promise<RoutineLog[]>;
  saveRoutineLog(log: RoutineLog): Promise<void>;
  /** 사진 저장 → 나중에 resolvePhotoUrl 로 볼 수 있는 주소 */
  uploadPhoto(classId: string, uid: string, file: Blob): Promise<string>;
  resolvePhotoUrl(url: string): Promise<string>;

  // ── 튜터 ──
  listTutorRooms(classId: string): Promise<TutorRoom[]>;
  saveTutorRoom(room: TutorRoom): Promise<void>;
  deleteTutorRoom(classId: string, id: string): Promise<void>;
  listTutorMessages(classId: string, filter?: ByUserFilter & { roomId?: string }): Promise<TutorMessage[]>;
  addTutorMessage(message: TutorMessage): Promise<void>;

  // ── AI 사용량 (하루 횟수 제한) ──
  getAiUsage(classId: string, uid: string, date: KstDate): Promise<number>;
  incrementAiUsage(classId: string, uid: string, date: KstDate): Promise<number>;
}

/** 루틴 인증은 "루틴 × 학생 × 날짜"마다 하나 → 아이디를 이렇게 정하면 하루 1회가 저절로 지켜집니다. */
export function routineLogId(routineId: string, uid: string, date: KstDate): string {
  return `${routineId}_${uid}_${date}`;
}
