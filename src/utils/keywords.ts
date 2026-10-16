// 튜터 질문에서 자주 나온 낱말을 뽑습니다. (간단한 방식: 띄어쓰기로 자르고 조사 떼기)

const STOP_WORDS = new Set([
  '이거', '그거', '저거', '이게', '그게', '뭐야', '뭐예요', '뭔가요', '무엇', '어떻게', '왜', '알려줘', '알려주세요',
  '궁금해', '궁금해요', '질문', '선생님', '그리고', '근데', '그런데', '정말', '진짜', '좀', '더', '수', '것', '거',
  '있어', '있어요', '없어', '해요', '하는', '하면', '되나요', '돼요', '인가요', '이에요', '예요', '나요', '건가요',
]);

// 끝에 붙는 흔한 조사·어미 (긴 것부터 검사)
const ENDINGS = ['에서는', '으로는', '에게는', '이랑', '에서', '으로', '에게', '한테', '까지', '부터', '이란', '란', '은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '도', '만'];

export function normalizeWord(raw: string): string {
  let word = raw.replace(/[^가-힣a-zA-Z0-9]/g, '');
  for (const end of ENDINGS) {
    if (word.length > end.length + 1 && word.endsWith(end)) {
      word = word.slice(0, -end.length);
      break;
    }
  }
  return word;
}

/** 질문 목록 → 자주 나온 낱말 [{word, count}] (많은 순) */
export function topKeywords(questions: string[], limit = 10): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const q of questions) {
    const seen = new Set<string>();
    for (const raw of q.split(/\s+/)) {
      const word = normalizeWord(raw);
      if (word.length < 2 || STOP_WORDS.has(word) || seen.has(word)) continue;
      seen.add(word);
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}
