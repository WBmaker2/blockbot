import { describe, expect, it } from 'vitest';
import { Grid, sameCell } from '../../src/world/grid';
import {
  forward,
  turnLeft,
  turnRight,
  moved,
  turned,
  yawForDirection
} from '../../src/world/robot';
import { isWallAhead } from '../../src/world/collision';
import { isAtGoal, isGoalAhead } from '../../src/world/goal';

describe('direction and movement', () => {
  it('maps cardinal vectors', () => {
    expect(forward({ x: 2, z: 2 }, 'N')).toEqual({ x: 2, z: 1 });
    expect(forward({ x: 2, z: 2 }, 'E')).toEqual({ x: 3, z: 2 });
    expect(forward({ x: 2, z: 2 }, 'S')).toEqual({ x: 2, z: 3 });
    expect(forward({ x: 2, z: 2 }, 'W')).toEqual({ x: 1, z: 2 });
  });

  it('turns left and right in a cycle', () => {
    expect(turnLeft('N')).toBe('W');
    expect(turnLeft('W')).toBe('S');
    expect(turnLeft('S')).toBe('E');
    expect(turnLeft('E')).toBe('N');
    expect(turnRight('N')).toBe('E');
    expect(turnRight('E')).toBe('S');
    expect(turnRight('S')).toBe('W');
    expect(turnRight('W')).toBe('N');
  });

  it('moves and turns without mutating the input', () => {
    const robot = { x: 1, z: 1, dir: 'N' as const };
    expect(moved(robot)).toEqual({ x: 1, z: 0, dir: 'N' });
    expect(turned(robot, 'right')).toEqual({ x: 1, z: 1, dir: 'E' });
    expect(robot).toEqual({ x: 1, z: 1, dir: 'N' });
  });

  it('provides yaw angles for each direction', () => {
    expect(yawForDirection('N')).toBeCloseTo(Math.PI);
    expect(yawForDirection('E')).toBeCloseTo(Math.PI / 2);
    expect(yawForDirection('S')).toBeCloseTo(0);
    expect(yawForDirection('W')).toBeCloseTo(-Math.PI / 2);
  });
});

describe('grid rules', () => {
  const grid = new Grid(5, 5, [{ x: 1, z: 0 }], { x: 4, z: 4 });

  it('knows inside and outside cells', () => {
    expect(grid.isInside({ x: 0, z: 0 })).toBe(true);
    expect(grid.isInside({ x: 4, z: 4 })).toBe(true);
    expect(grid.isInside({ x: -1, z: 0 })).toBe(false);
    expect(grid.isInside({ x: 5, z: 0 })).toBe(false);
  });

  it('detects walls and blocked cells', () => {
    expect(grid.isWall({ x: 1, z: 0 })).toBe(true);
    expect(grid.isBlocked({ x: 1, z: 0 })).toBe(true);
    expect(grid.isBlocked({ x: 5, z: 0 })).toBe(true);
    expect(grid.isBlocked({ x: 2, z: 0 })).toBe(false);
  });

  it('checks the robot front cell', () => {
    expect(isWallAhead({ x: 0, z: 0, dir: 'E' }, grid)).toBe(true);
    expect(isWallAhead({ x: 0, z: 0, dir: 'S' }, grid)).toBe(false);
    expect(isWallAhead({ x: 4, z: 0, dir: 'E' }, grid)).toBe(true);
  });

  it('detects goals at the current cell and ahead', () => {
    expect(isAtGoal({ x: 4, z: 4, dir: 'N' }, { x: 4, z: 4 })).toBe(true);
    expect(isGoalAhead({ x: 3, z: 4, dir: 'E' }, { x: 4, z: 4 })).toBe(true);
    expect(isGoalAhead({ x: 4, z: 4, dir: 'E' }, { x: 4, z: 4 })).toBe(false);
    expect(sameCell({ x: 1, z: 2 }, { x: 1, z: 2 })).toBe(true);
  });
});
