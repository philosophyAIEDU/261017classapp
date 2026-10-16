// 한국어 조사 고르기: 받침이 있으면 '이', 없으면 '가' 처럼 알맞은 조사를 붙입니다.
// 예) withJosa('AI 선생님', '이', '가') → 'AI 선생님이', withJosa('AI 코치', '이', '가') → 'AI 코치가'

export function hasBatchim(word: string): boolean {
  const last = word.trim().charCodeAt(word.trim().length - 1);
  if (last < 0xac00 || last > 0xd7a3) return false;
  return (last - 0xac00) % 28 !== 0;
}

export function withJosa(word: string, withBatchim: string, withoutBatchim: string): string {
  return word + (hasBatchim(word) ? withBatchim : withoutBatchim);
}
