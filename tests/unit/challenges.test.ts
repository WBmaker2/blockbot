import { describe, expect, it } from 'vitest';
import { CHALLENGES } from '../../src/features/challenges';
import { countBlocks } from '../../src/lang/ast';
import { executeProgram } from '../../src/lang/interpreter';
import { parseTextProgram } from '../../src/lang/textMode';
import { starsForBlockCount } from '../../src/features/challenges/scoring';
import { BLOCK_TYPE_BY_NAME } from '../../src/features/challenges';

describe('challenge content', () => {
  it('ships ten unique challenges', () => {
    expect(CHALLENGES).toHaveLength(10);
    expect(new Set(CHALLENGES.map((challenge) => challenge.id)).size).toBe(10);
  });

  for (const challenge of CHALLENGES) {
    it(`solves "${challenge.titleKo}" with its reference solution`, () => {
      expect(challenge.solution).toBeTruthy();
      const program = parseTextProgram(challenge.solution ?? '');
      const result = executeProgram(program, challenge);
      expect(result.error).toBeUndefined();
      expect(result.status).toBe('success');

      const blocks = countBlocks(program);
      expect(blocks).toBeLessThanOrEqual(challenge.parBlocks);
      expect(starsForBlockCount(blocks, challenge.parBlocks)).toBe(3);
    });

    it(`keeps "${challenge.titleKo}" within its allowed blocks`, () => {
      const program = parseTextProgram(challenge.solution ?? '');
      const used = new Set<string>();
      const walk = (statements: typeof program): void => {
        for (const statement of statements) {
          switch (statement.type) {
            case 'move':
              used.add('move');
              break;
            case 'turn':
              used.add(statement.dir === 'left' ? 'turn_left' : 'turn_right');
              break;
            case 'repeat':
              used.add('repeat');
              walk(statement.body);
              break;
            case 'ifWall':
              used.add('if_wall');
              walk(statement.then);
              if (statement.else) walk(statement.else);
              break;
            case 'ifGoal':
              used.add('if_goal');
              walk(statement.then);
              if (statement.else) walk(statement.else);
              break;
          }
        }
      };
      walk(program);
      for (const name of used) {
        expect(challenge.allowedBlocks).toContain(name);
        expect(BLOCK_TYPE_BY_NAME[name]).toBeTruthy();
      }
    });

    it(`has a valid "${challenge.titleKo}" world setup`, () => {
      const { width, depth } = challenge.grid;
      expect(width).toBeGreaterThan(0);
      expect(depth).toBeGreaterThan(0);
      expect(width).toBeLessThanOrEqual(6);
      expect(depth).toBeLessThanOrEqual(6);
      expect(challenge.robot.x).toBeGreaterThanOrEqual(0);
      expect(challenge.robot.x).toBeLessThan(width);
      expect(challenge.robot.z).toBeGreaterThanOrEqual(0);
      expect(challenge.robot.z).toBeLessThan(depth);
      expect(challenge.goal.x).toBeGreaterThanOrEqual(0);
      expect(challenge.goal.x).toBeLessThan(width);
      expect(challenge.goal.z).toBeGreaterThanOrEqual(0);
      expect(challenge.goal.z).toBeLessThan(depth);
      expect(
        challenge.walls.some((wall) => wall.x === challenge.robot.x && wall.z === challenge.robot.z)
      ).toBe(false);
      expect(
        challenge.walls.some((wall) => wall.x === challenge.goal.x && wall.z === challenge.goal.z)
      ).toBe(false);
    });
  }
});
