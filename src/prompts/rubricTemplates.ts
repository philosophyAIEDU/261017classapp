// 루브릭 예시 템플릿 4종입니다. (어학원 영어 수업용)
// ✏️ 선생님이 바꿔도 되는 부분: 이 파일 전체. 기준을 추가·삭제하거나 설명을 수업에 맞게 고치세요.
//    (기준은 2~5개, 각 기준마다 1·2·3단계 설명을 꼭 3개 적어 주세요.)

import type { RubricCriterion } from '../types';

export interface RubricTemplate {
  id: string;
  label: string;
  emoji: string;
  suggestedTitle: string;
  suggestedPrompt: string;
  minChars: number;
  maxChars: number;
  rubric: RubricCriterion[];
}

export const rubricTemplates: RubricTemplate[] = [
  {
    id: 'diary',
    label: '영어 일기',
    emoji: '✍️',
    suggestedTitle: 'My Weekend (영어 일기)',
    suggestedPrompt: '지난 주말에 한 일을 영어로 5문장 이상 써 보세요. 과거 시제를 써 봅시다.',
    minChars: 150,
    maxChars: 1000,
    rubric: [
      { name: '문법 정확성', levels: ['시제·주어 동사 일치 오류가 많음', '오류가 조금 있음', '거의 오류 없음'] },
      { name: '어휘 다양성', levels: ['같은 단어를 반복', '알맞은 단어를 골라 씀', '배운 표현을 적극적으로 씀'] },
      { name: '내용 전달', levels: ['무엇을 했는지 알기 어려움', '한 일이 드러남', '느낌과 이유까지 생생하게 전달됨'] },
    ],
  },
  {
    id: 'opinion',
    label: '영어 에세이',
    emoji: '🗣️',
    suggestedTitle: 'Opinion Essay: Should students use smartphones in class?',
    suggestedPrompt: '수업 시간 스마트폰 사용에 대한 나의 의견을 영어로 써 보세요. 이유 2가지와 예시를 넣고, In conclusion 으로 마무리하세요.',
    minChars: 300,
    maxChars: 1500,
    rubric: [
      { name: '주장의 명확성', levels: ['의견이 드러나지 않음', '첫 문단에 의견이 있음', '처음부터 끝까지 의견이 일관됨'] },
      { name: '근거와 예시', levels: ['이유가 없거나 하나', '이유가 2개 이상', '이유마다 구체적인 예시가 있음'] },
      { name: '연결어 사용', levels: ['문장이 끊어져 있음', 'First, Also 같은 연결어를 씀', 'However, For example 등으로 흐름이 자연스러움'] },
      { name: '문법과 철자', levels: ['오류가 많아 읽기 어려움', '오류가 조금 있음', '거의 오류 없음'] },
    ],
  },
  {
    id: 'speech',
    label: '스피치 원고',
    emoji: '🎤',
    suggestedTitle: 'Self-Introduction Speech (1분 자기소개)',
    suggestedPrompt: '1분 동안 발표할 영어 자기소개 원고를 써 보세요. 취미, 좋아하는 것, 올해 목표를 넣어 보세요. (이름 대신 별명을 써도 좋아요)',
    minChars: 200,
    maxChars: 1000,
    rubric: [
      { name: '구성', levels: ['시작·끝 인사가 없음', '인사-내용-마무리가 있음', '듣는 사람을 끌어들이는 시작과 마무리'] },
      { name: '말하기 좋은 문장', levels: ['문장이 너무 길거나 어려움', '대체로 짧고 분명함', '소리 내어 읽기 쉽고 리듬감이 있음'] },
      { name: '표현력', levels: ['기본 단어만 씀', '배운 표현을 씀', '감정과 이유를 생생하게 표현함'] },
    ],
  },
  {
    id: 'bookreport',
    label: '영어 독후감',
    emoji: '📚',
    suggestedTitle: 'Book Report',
    suggestedPrompt: '이번 달에 읽은 영어 책의 줄거리를 3문장으로 요약하고, 가장 좋았던 장면과 그 이유를 영어로 써 보세요.',
    minChars: 200,
    maxChars: 1200,
    rubric: [
      { name: '줄거리 요약', levels: ['줄거리 일부만 언급', '핵심 사건을 정리함', '사건의 원인과 결과까지 요약함'] },
      { name: '나의 생각', levels: ['I like it 수준의 감상', '이유와 함께 감상', '나의 경험과 연결함'] },
      { name: '문장 표현', levels: ['책 문장을 그대로 베낌', '내 말로 바꿔 씀', '다양한 문장 구조를 씀'] },
    ],
  },
];
