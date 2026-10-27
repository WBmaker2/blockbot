import type { Challenge, Direction, RobotState } from '../../lang/ast';
import type { Preferences, ProgressData } from '../../storage/progress';
import { renderSettings } from '../../ui/Settings';
import { starsLabel } from '../challenges/scoring';

export interface TeacherPanelOptions {
  container: HTMLElement;
  challenges: Challenge[];
  selectedId: string;
  progress: ProgressData;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onReset: () => void;
  onPrint: (id: string) => void;
  onPreferences: (preferences: Partial<Preferences>) => void;
}

const BLOCK_LABELS: Record<string, string> = {
  move: '앞으로',
  turn_left: '왼쪽 회전',
  turn_right: '오른쪽 회전',
  repeat: '반복',
  if_wall: '벽 확인',
  if_goal: '목표 확인'
};

const DIRECTION_ARROWS: Record<Direction, string> = {
  N: '▲',
  E: '▶',
  S: '▼',
  W: '◀'
};

export function renderTeacherPanel(options: TeacherPanelOptions): void {
  const { container, challenges, selectedId, progress } = options;
  const challenge = challenges.find((candidate) => candidate.id === selectedId) ?? challenges[0];
  if (!challenge) return;
  const stars = progress.completed[challenge.id] ?? 0;

  container.innerHTML = `
    <div class="teacher-toolbar">
      <label class="select-field">
        <span>도전 선택</span>
        <select id="teacher-challenge-select">
          ${challenges
            .map(
              (item, index) =>
                `<option value="${item.id}" ${item.id === challenge.id ? 'selected' : ''}>${String(index + 1).padStart(2, '0')} · ${escapeHtml(item.titleKo)}</option>`
            )
            .join('')}
        </select>
      </label>
      <div class="teacher-toolbar__actions">
        <button class="btn btn--primary" type="button" data-teacher="open">이 도전 열기</button>
        <button class="btn btn--ghost" type="button" data-teacher="print">학습지 인쇄</button>
      </div>
    </div>

    <div class="teacher-grid">
      <article class="teacher-card">
        <div class="teacher-card__head">
          <div>
            <p class="eyebrow">${String(challenges.indexOf(challenge) + 1).padStart(2, '0')}번째 도전</p>
            <h3>${escapeHtml(challenge.titleKo)}</h3>
            <p>${escapeHtml(challenge.subtitleKo ?? '')}</p>
          </div>
          <span class="teacher-stars ${stars > 0 ? 'has-stars' : ''}">${stars > 0 ? starsLabel(stars) : '☆☆☆'}</span>
        </div>
        <dl class="teacher-meta">
          <div><dt>그리드</dt><dd>${challenge.grid.width} × ${challenge.grid.depth}</dd></div>
          <div><dt>시작</dt><dd>(${challenge.robot.x}, ${challenge.robot.z}) ${DIRECTION_ARROWS[challenge.robot.dir]}</dd></div>
          <div><dt>목표</dt><dd>(${challenge.goal.x}, ${challenge.goal.z})</dd></div>
          <div><dt>기준 블록</dt><dd>${challenge.parBlocks}개</dd></div>
          <div><dt>사용 블록</dt><dd>${challenge.allowedBlocks.map((block) => BLOCK_LABELS[block] ?? block).join(', ')}</dd></div>
        </dl>
        <p class="teacher-hint"><strong>힌트</strong> ${escapeHtml(challenge.hintKo)}</p>
        <p class="teacher-explanation"><strong>설명</strong> ${escapeHtml(challenge.explanationKo)}</p>
      </article>

      <article class="teacher-card">
        <h3>지도 미리보기</h3>
        <pre class="mini-map" aria-label="도전 지도">${renderMiniMap(challenge)}</pre>
        <p class="mini-map__legend"><span>▲▶▼◀ 로봇</span><span>★ 목표</span><span>█ 벽</span></p>
      </article>
    </div>

    <details class="teacher-solution">
      <summary>해답 보기</summary>
      <pre>${escapeHtml(challenge.solution ?? 'move')}</pre>
      <p>${escapeHtml(challenge.explanationKo)}</p>
    </details>

    <section class="teacher-settings">
      <h3>화면 설정</h3>
      <div id="teacher-settings-content"></div>
    </section>

    <section class="teacher-danger">
      <div>
        <h3>진행 기록 초기화</h3>
        <p>모든 도전의 별과 저장된 블록을 지워요. 화면 설정은 유지됩니다.</p>
      </div>
      <button class="btn btn--danger" type="button" data-teacher="reset">기록 초기화</button>
    </section>
  `;

  const select = container.querySelector<HTMLSelectElement>('#teacher-challenge-select');
  select?.addEventListener('change', () => {
    if (select.value) options.onSelect(select.value);
  });

  container
    .querySelector<HTMLButtonElement>('[data-teacher="open"]')
    ?.addEventListener('click', () => {
      options.onOpen(challenge.id);
    });

  container
    .querySelector<HTMLButtonElement>('[data-teacher="print"]')
    ?.addEventListener('click', () => {
      options.onPrint(challenge.id);
    });

  container
    .querySelector<HTMLButtonElement>('[data-teacher="reset"]')
    ?.addEventListener('click', () => {
      options.onReset();
    });

  const settingsHost = container.querySelector<HTMLElement>('#teacher-settings-content');
  if (settingsHost) {
    renderSettings(settingsHost, progress.preferences, options.onPreferences);
  }
}

function renderMiniMap(challenge: Challenge): string {
  const rows: string[] = [];
  const walls = new Set(challenge.walls.map((cell) => `${cell.x},${cell.z}`));
  for (let z = 0; z < challenge.grid.depth; z += 1) {
    let row = `${z} `;
    for (let x = 0; x < challenge.grid.width; x += 1) {
      if (x === challenge.robot.x && z === challenge.robot.z) {
        row += DIRECTION_ARROWS[challenge.robot.dir];
      } else if (x === challenge.goal.x && z === challenge.goal.z) {
        row += '★';
      } else if (walls.has(`${x},${z}`)) {
        row += '█';
      } else {
        row += '·';
      }
      row += ' ';
    }
    rows.push(row);
  }
  rows.push('  ' + Array.from({ length: challenge.grid.width }, (_, x) => x).join(' '));
  rows.push('  x →   z ↓');
  return rows.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildWorksheet(challenge: Challenge): string {
  const walls = new Set(challenge.walls.map((cell) => `${cell.x},${cell.z}`));
  const cells: string[] = [];
  cells.push('<table class="worksheet-grid"><tbody>');
  for (let z = 0; z < challenge.grid.depth; z += 1) {
    cells.push('<tr>');
    for (let x = 0; x < challenge.grid.width; x += 1) {
      let content = '';
      if (x === challenge.robot.x && z === challenge.robot.z) {
        content = DIRECTION_ARROWS[challenge.robot.dir];
      } else if (x === challenge.goal.x && z === challenge.goal.z) {
        content = '★';
      } else if (walls.has(`${x},${z}`)) {
        content = '█';
      }
      cells.push(`<td>${content}</td>`);
    }
    cells.push('</tr>');
  }
  cells.push('</tbody></table>');

  return `
    <h1>BlockBot 학습지</h1>
    <h2>${escapeHtml(challenge.titleKo)}</h2>
    <p>${escapeHtml(challenge.subtitleKo ?? '')}</p>
    <p><strong>미션</strong> 로봇을 목표 칸까지 움직이세요. 로봇은 화살표가 가리키는 방향을 바라보고 있어요.</p>
    <div class="worksheet-map">${cells.join('')}</div>
    <ul class="worksheet-legend">
      <li>▲▶▼◀ 로봇의 시작 위치와 방향</li>
      <li>★ 목표 칸</li>
      <li>█ 벽</li>
    </ul>
    <p><strong>기준 블록 수</strong> ${challenge.parBlocks}개</p>
    <p><strong>힌트</strong> ${escapeHtml(challenge.hintKo)}</p>
    <p class="worksheet-note">BlockBot에서 프로그램을 만들고, 실행 기록을 적어 보세요.</p>
    <div class="worksheet-lines"></div>
  `;
}

export function robotStartLabel(robot: RobotState): string {
  return `(${robot.x}, ${robot.z}) ${DIRECTION_ARROWS[robot.dir]}`;
}
