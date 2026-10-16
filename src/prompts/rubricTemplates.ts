// 루브릭 예시 템플릿 4종입니다.
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
    id: 'reading',
    label: '독서록',
    emoji: '📚',
    suggestedTitle: '이번 주 독서록',
    suggestedPrompt: '읽은 책의 줄거리를 정리하고, 가장 기억에 남는 장면과 그 이유를 써 보세요.',
    minChars: 200,
    maxChars: 800,
    rubric: [
      { name: '줄거리 이해', levels: ['줄거리 일부만 언급', '핵심 사건 정리', '사건 간 인과까지 설명'] },
      { name: '나의 생각', levels: ['감상 한 줄', '이유와 함께 감상', '자기 경험과 연결'] },
      { name: '표현과 맞춤법', levels: ['문장이 자주 끊기거나 틀림', '대체로 바르게 씀', '문장이 매끄럽고 정확함'] },
    ],
  },
  {
    id: 'argument',
    label: '논설문',
    emoji: '🗣️',
    suggestedTitle: '나의 주장 펼치기',
    suggestedPrompt: '"학교에서 스마트폰 사용을 허용해야 할까?"에 대한 나의 주장을 근거와 함께 써 보세요.',
    minChars: 300,
    maxChars: 1200,
    rubric: [
      { name: '주장의 명확성', levels: ['주장이 드러나지 않음', '주장이 드러남', '주장이 처음부터 끝까지 일관됨'] },
      { name: '근거의 타당성', levels: ['근거가 없거나 하나', '근거가 2개 이상', '근거가 구체적 사례·자료로 뒷받침됨'] },
      { name: '반론 고려', levels: ['반대 의견을 다루지 않음', '반대 의견을 언급함', '반대 의견을 반박하며 주장을 강화함'] },
      { name: '글의 짜임', levels: ['서론·본론·결론 구분이 없음', '구분은 있으나 연결이 약함', '문단이 자연스럽게 이어짐'] },
    ],
  },
  {
    id: 'english',
    label: '영작',
    emoji: '✍️',
    suggestedTitle: 'My Weekend (영어 일기)',
    suggestedPrompt: '지난 주말에 한 일을 영어로 5문장 이상 써 보세요. 과거 시제를 써 봅시다.',
    minChars: 100,
    maxChars: 1000,
    rubric: [
      { name: '문법 정확성', levels: ['시제·주어 동사 일치 오류가 많음', '오류가 조금 있음', '거의 오류 없음'] },
      { name: '어휘 다양성', levels: ['같은 단어를 반복', '알맞은 단어를 골라 씀', '새로운 표현을 적극적으로 씀'] },
      { name: '내용 전달', levels: ['무엇을 했는지 알기 어려움', '한 일이 드러남', '느낌과 이유까지 생생하게 전달됨'] },
    ],
  },
  {
    id: 'science',
    label: '과학 탐구 보고서',
    emoji: '🔬',
    suggestedTitle: '탐구 보고서: 식물의 성장과 빛',
    suggestedPrompt: '탐구 질문, 가설, 실험 방법, 결과, 결론 순서로 보고서를 써 보세요.',
    minChars: 300,
    maxChars: 1500,
    rubric: [
      { name: '탐구 질문과 가설', levels: ['질문이 모호함', '질문과 가설이 있음', '검증 가능한 가설을 세움'] },
      { name: '실험 설계', levels: ['방법이 빠져 있음', '방법을 순서대로 씀', '변인 통제까지 설명함'] },
      { name: '결과 해석', levels: ['결과만 나열', '결과로 결론을 냄', '결과의 한계와 다음 탐구까지 제안'] },
    ],
  },
];
