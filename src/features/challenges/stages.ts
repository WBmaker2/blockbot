export type StageId = 'sequence' | 'repeat' | 'choice' | 'choice-loop' | 'mixed';

export interface LearningStage {
  id: StageId;
  order: number;
  titleKo: string;
  taglineKo: string;
  descriptionKo: string;
  learningGoalKo: string;
}

export const STAGES: LearningStage[] = [
  {
    id: 'sequence',
    order: 1,
    titleKo: '순차',
    taglineKo: '위에서 아래로 차례대로',
    descriptionKo: '명령을 위에서 아래로 차례대로 실행하며 로봇의 움직임을 예상해요.',
    learningGoalKo: '여러 동작을 순서대로 연결해 로봇을 움직일 수 있어요.'
  },
  {
    id: 'repeat',
    order: 2,
    titleKo: '반복',
    taglineKo: '같은 일은 한 번만',
    descriptionKo: '같은 동작을 반복 블록으로 묶어 더 짧고 분명한 프로그램을 만들어요.',
    learningGoalKo: '반복 블록으로 같은 동작을 짧게 표현할 수 있어요.'
  },
  {
    id: 'choice',
    order: 3,
    titleKo: '선택',
    taglineKo: '상황을 보고 고르기',
    descriptionKo: '앞에 벽이 있는지, 목표가 있는지 확인하고 알맞은 동작을 골라요.',
    learningGoalKo: '벽과 목표를 확인해 맞는 가지를 고를 수 있어요.'
  },
  {
    id: 'choice-loop',
    order: 4,
    titleKo: '선택과 반복',
    taglineKo: '조건과 반복을 함께',
    descriptionKo: '반복하면서 매번 조건을 확인하고, 상황이 달라지면 다른 길을 선택해요.',
    learningGoalKo: '반복 안에서 조건을 확인하며 경로를 바꿀 수 있어요.'
  },
  {
    id: 'mixed',
    order: 5,
    titleKo: '종합',
    taglineKo: '모두 모아서',
    descriptionKo: '순차, 반복, 선택을 조합해 더 길고 복잡한 문제를 해결해요.',
    learningGoalKo: '순차, 반복, 선택을 조합해 문제를 해결할 수 있어요.'
  }
];

export function getStage(id: string): LearningStage {
  return STAGES.find((stage) => stage.id === id) ?? STAGES[0]!;
}
