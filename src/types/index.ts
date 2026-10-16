// 앱 전체에서 쓰는 데이터 모양(타입) 모음입니다.
// Firestore 구조(docs/firebase-structure.md)와 같은 이름을 씁니다.

import type { TargetMode } from '../config/appConfig';

export type Role = 'teacher' | 'student';
export type ModuleKey = 'assignments' | 'routines' | 'tutor';
export type FeedbackTone = 'coach' | 'editor';

/** 날짜 문자열 'yyyy-MM-dd' (항상 한국 시간 기준) */
export type KstDate = string;

export interface ClassRoom {
  id: string;
  name: string;
  code: string; // 6자리 학급 코드
  teacherUid: string;
  mode: TargetMode;
  enabledModules: ModuleKey[];
  createdAt: string; // ISO 시각
}

export interface Member {
  uid: string;
  classId: string;
  role: Role;
  studentNo: string; // 교사는 빈 문자열
  name: string;
  approved: boolean;
  joinedAt: string;
  resetRequested?: boolean; // 비밀번호 초기화 요청
}

/** 로그인한 사람 */
export interface CurrentUser {
  uid: string;
  role: Role;
  name: string;
  classId: string | null; // 교사가 아직 학급을 안 만들었으면 null
  approved: boolean; // 학생은 교사가 승인해야 true. 교사는 항상 true
}

// ── 과제 ─────────────────────────────────────

export interface RubricCriterion {
  name: string;
  levels: [string, string, string]; // 1단계, 2단계, 3단계 설명
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  prompt: string; // 안내문
  dueAt: string; // ISO 시각
  minChars: number;
  maxChars: number;
  rubric: RubricCriterion[];
  feedbackRelease: 'instant' | 'teacher'; // 즉시 공개 / 교사 확인 후 공개
  tone: FeedbackTone;
  createdAt: string;
}

export interface RubricResult {
  criterion: string;
  level: number; // 1~3
  comment: string;
}

/** Gemini(또는 샘플 AI)가 돌려주는 피드백 */
export interface AiFeedback {
  praise: string;
  improvements: string[];
  rubric: RubricResult[];
  question: string;
}

export interface SubmissionVersion {
  text: string;
  ai: AiFeedback | null;
  released: boolean; // 학생에게 피드백이 공개되었는지
  teacherComment: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  classId: string;
  assignmentId: string;
  uid: string;
  versions: SubmissionVersion[];
  status: 'waiting' | 'released'; // 마지막 버전 기준: 교사 확인 대기 / 공개됨
  studentUnread: boolean; // 학생이 아직 안 읽은 새 피드백이 있는지
  updatedAt: string;
}

// ── 루틴 ─────────────────────────────────────

export interface Routine {
  id: string;
  classId: string;
  title: string;
  description: string;
  days: number[]; // 0=일 ~ 6=토. 빈 배열이면 매일
  startDate: KstDate;
  endDate: KstDate;
  createdAt: string;
}

export interface RoutineLog {
  id: string;
  classId: string;
  routineId: string;
  uid: string;
  date: KstDate;
  text: string;
  imageUrls: string[];
  createdAt: string;
  updatedAt: string;
}

// ── 튜터 ─────────────────────────────────────

export interface TutorRoom {
  id: string;
  classId: string;
  topic: string;
  persona: string;
  teacherInstruction: string;
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  classId: string;
  roomId: string;
  uid: string;
  role: 'student' | 'tutor';
  text: string;
  createdAt: string;
}
