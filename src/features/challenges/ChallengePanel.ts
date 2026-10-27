import type { Challenge } from '../../lang/ast';
import { starsLabel } from '../challenges/scoring';
import { STAGES } from '../challenges/stages';

export function renderChallengeList(
  container: HTMLElement,
  challenges: Challenge[],
  completed: Record<string, number>,
  currentId: string,
  onSelect: (id: string) => void
): void {
  container.replaceChildren();

  for (const stage of STAGES) {
    const stageChallenges = challenges.filter((challenge) => challenge.stage === stage.id);
    if (stageChallenges.length === 0) continue;

    const completedCount = stageChallenges.filter(
      (challenge) => (completed[challenge.id] ?? 0) > 0
    ).length;
    const percent = Math.round((completedCount / stageChallenges.length) * 100);

    const section = document.createElement('section');
    section.className = 'stage-section';
    section.dataset.stage = stage.id;
    section.setAttribute('aria-labelledby', `stage-${stage.id}-title`);

    const heading = document.createElement('div');
    heading.className = 'stage-heading';
    heading.innerHTML = `
      <span class="stage-heading__num" aria-hidden="true">${stage.order}</span>
      <span class="stage-heading__text">
        <span class="stage-heading__eyebrow">${stage.order}단계 · ${escapeHtml(stage.taglineKo)}</span>
        <h3 id="stage-${stage.id}-title">${escapeHtml(stage.titleKo)}</h3>
        <p>${escapeHtml(stage.descriptionKo)}</p>
      </span>
      <span class="stage-heading__progress ${completedCount === stageChallenges.length ? 'is-done' : ''}">
        <span class="stage-heading__count">${completedCount} / ${stageChallenges.length} 완료</span>
        <span class="stage-heading__bar" aria-hidden="true"><span style="width: ${percent}%"></span></span>
      </span>
    `;

    const grid = document.createElement('div');
    grid.className = 'challenge-grid';

    stageChallenges.forEach((challenge) => {
      const index = challenges.findIndex((candidate) => candidate.id === challenge.id);
      const stars = completed[challenge.id] ?? 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'challenge-card';
      if (challenge.id === currentId) button.classList.add('is-current');
      if (stars > 0) button.classList.add('is-complete');
      if (challenge.id === currentId) button.setAttribute('aria-current', 'true');

      button.innerHTML = `
        <span class="challenge-card__num">${String(index + 1).padStart(2, '0')}</span>
        <span class="challenge-card__body">
          <span class="challenge-card__title">${escapeHtml(challenge.titleKo)}</span>
          <span class="challenge-card__subtitle">${escapeHtml(challenge.subtitleKo ?? '')}</span>
          <span class="challenge-card__meta">기준 ${challenge.parBlocks}블록 · ${challenge.grid.width}×${challenge.grid.depth}</span>
        </span>
        <span class="challenge-card__stars ${stars > 0 ? 'has-stars' : ''}" aria-hidden="true">${stars > 0 ? starsLabel(stars) : '☆☆☆'}</span>
      `;

      button.addEventListener('click', () => onSelect(challenge.id));
      grid.appendChild(button);
    });

    section.append(heading, grid);
    container.appendChild(section);
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
