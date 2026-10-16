// 과제 제출물 관련 작은 계산들

import { appConfig, terms } from '../config/appConfig';
import type { Assignment, Submission, SubmissionVersion } from '../types';

export function latestVersion(submission: Submission): SubmissionVersion {
  return submission.versions[submission.versions.length - 1];
}

/** 남은 고쳐 쓰기 횟수 */
export function revisionsLeft(submission: Submission | undefined): number {
  if (!submission) return appConfig.assignments.maxRevisions;
  return Math.max(0, appConfig.assignments.maxRevisions - (submission.versions.length - 1));
}

export function isPastDue(assignment: Assignment, now: Date = new Date()): boolean {
  return new Date(assignment.dueAt).getTime() < now.getTime();
}

/** 글자 수 (공백 포함) */
export function countChars(text: string): number {
  return text.trim().length;
}

/** 학생 화면의 과제 상태 */
export function studentStatus(submission: Submission | undefined): { label: string; tone: 'todo' | 'waiting' | 'done' } {
  if (!submission) return { label: '제출 전', tone: 'todo' };
  if (submission.status === 'waiting') return { label: `${terms.teacher} 확인 중`, tone: 'waiting' };
  return { label: submission.studentUnread ? '새 피드백' : '피드백 완료', tone: 'done' };
}

export const statusChipClass: Record<'todo' | 'waiting' | 'done', string> = {
  todo: 'bg-accent-100 text-accent-800',
  waiting: 'bg-primary-50 text-primary-700',
  done: 'bg-emerald-50 text-success',
};
