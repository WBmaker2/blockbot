import type { Challenge } from '../../lang/ast';
import { starsLabel } from '../challenges/scoring';

export function renderChallengeList(
  container: HTMLElement,
  challenges: Challenge[],
  completed: Record<string, number>,
  currentId: string,
  onSelect: (id: string) => void
): void {
  container.replaceChildren();

  challenges.forEach((challenge, index) => {
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
    container.appendChild(button);
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
