import { describe, expect, it } from 'vitest';
import { starsForBlockCount, starsLabel } from '../../src/features/challenges/scoring';

describe('star rating', () => {
  it('awards three stars at or below par', () => {
    expect(starsForBlockCount(1, 5)).toBe(3);
    expect(starsForBlockCount(5, 5)).toBe(3);
  });

  it('awards two stars within two blocks over par', () => {
    expect(starsForBlockCount(6, 5)).toBe(2);
    expect(starsForBlockCount(7, 5)).toBe(2);
  });

  it('awards one star above par plus two', () => {
    expect(starsForBlockCount(8, 5)).toBe(1);
    expect(starsForBlockCount(99, 5)).toBe(1);
  });

  it('renders star labels', () => {
    expect(starsLabel(3)).toBe('★★★');
    expect(starsLabel(2)).toBe('★★☆');
    expect(starsLabel(1)).toBe('★☆☆');
  });
});
