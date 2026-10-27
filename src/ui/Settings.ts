import type { Preferences } from '../storage/progress';

export function renderSettings(
  container: HTMLElement,
  preferences: Preferences,
  onChange: (preferences: Partial<Preferences>) => void
): void {
  container.replaceChildren();
  const group = document.createElement('div');
  group.className = 'settings-list';

  const items: Array<{
    key: keyof Preferences;
    title: string;
    description: string;
  }> = [
    {
      key: 'reducedMotion',
      title: '애니메이션 줄이기',
      description: '로봇이 순간이동하고 목표 표시가 멈춰요. 블록 강조는 그대로 유지됩니다.'
    },
    {
      key: 'highContrast',
      title: '고대비 화면',
      description: '글자와 경계를 더 진하게 표시해요.'
    },
    {
      key: 'showCoordinates',
      title: '그리드 좌표 표시',
      description: '3D 세계 가장자리에 x, z 좌표를 보여 줘요.'
    },
    {
      key: 'highlightBlocks',
      title: '실행 중 블록 강조',
      description: '지금 실행 중인 블록을 밝게 표시해요.'
    }
  ];

  for (const item of items) {
    const label = document.createElement('label');
    label.className = 'settings-row';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(preferences[item.key]);
    input.addEventListener('change', () => {
      onChange({ [item.key]: input.checked } as Partial<Preferences>);
    });
    const text = document.createElement('span');
    text.className = 'settings-row__text';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const description = document.createElement('span');
    description.textContent = item.description;
    text.append(title, description);
    label.append(input, text);
    group.appendChild(label);
  }

  container.appendChild(group);
}
