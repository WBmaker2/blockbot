import { describe, expect, it } from 'vitest';
import type { Challenge, Program } from '../../src/lang/ast';
import { executeProgram } from '../../src/lang/interpreter';
import { DEFAULT_LIMITS } from '../../src/lang/limits';

function challenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'test',
    titleKo: '테스트',
    grid: { width: 5, depth: 5 },
    robot: { x: 0, z: 0, dir: 'E' },
    goal: { x: 4, z: 0 },
    walls: [],
    allowedBlocks: ['move', 'turn_left', 'turn_right', 'repeat', 'if_wall', 'if_goal'],
    parBlocks: 5,
    hintKo: '',
    explanationKo: '',
    ...overrides
  };
}

describe('interpreter sequences', () => {
  it('executes moves and reaches the goal', () => {
    const program: Program = [
      { type: 'move' },
      { type: 'move' },
      { type: 'move' },
      { type: 'move' }
    ];
    const result = executeProgram(program, challenge());
    expect(result.status).toBe('success');
    expect(result.goalReached).toBe(true);
    expect(result.finalRobot).toEqual({ x: 4, z: 0, dir: 'E' });
    expect(result.actions).toHaveLength(4);
    expect(result.actions.map((action) => action.type)).toEqual(['move', 'move', 'move', 'move']);
  });

  it('reports an incomplete program when the goal is not reached', () => {
    const result = executeProgram([{ type: 'move' }], challenge());
    expect(result.status).toBe('incomplete');
    expect(result.goalReached).toBe(false);
    expect(result.finalRobot).toEqual({ x: 1, z: 0, dir: 'E' });
  });

  it('executes turns', () => {
    const program: Program = [
      { type: 'turn', dir: 'left' },
      { type: 'turn', dir: 'left' },
      { type: 'turn', dir: 'right' }
    ];
    const result = executeProgram(program, challenge({ goal: { x: 0, z: 0 } }));
    expect(result.finalRobot.dir).toBe('N');
    expect(result.status).toBe('success');
    expect(result.actions).toHaveLength(3);
  });
});

describe('interpreter repeats', () => {
  it('handles repeat 0, 1, and many iterations', () => {
    const zero = executeProgram(
      [{ type: 'repeat', times: 0, body: [{ type: 'move' }] }],
      challenge()
    );
    expect(zero.actions).toHaveLength(0);
    expect(zero.status).toBe('incomplete');

    const one = executeProgram(
      [{ type: 'repeat', times: 1, body: [{ type: 'move' }] }],
      challenge()
    );
    expect(one.finalRobot).toEqual({ x: 1, z: 0, dir: 'E' });

    const many = executeProgram(
      [{ type: 'repeat', times: 4, body: [{ type: 'move' }] }],
      challenge()
    );
    expect(many.status).toBe('success');
    expect(many.actions).toHaveLength(4);
  });

  it('supports nested repeats', () => {
    const program: Program = [
      {
        type: 'repeat',
        times: 2,
        body: [
          { type: 'repeat', times: 2, body: [{ type: 'move' }] },
          { type: 'turn', dir: 'right' }
        ]
      }
    ];
    const result = executeProgram(
      program,
      challenge({
        robot: { x: 0, z: 0, dir: 'E' },
        goal: { x: 2, z: 2 }
      })
    );
    expect(result.status).toBe('success');
    expect(result.finalRobot).toEqual({ x: 2, z: 2, dir: 'W' });
    expect(result.actions.filter((action) => action.type === 'move')).toHaveLength(4);
  });
});

describe('interpreter conditions', () => {
  it('runs the true branch of if wall', () => {
    const program: Program = [{ type: 'ifWall', then: [{ type: 'turn', dir: 'left' }] }];
    const result = executeProgram(
      program,
      challenge({ robot: { x: 0, z: 0, dir: 'E' }, walls: [{ x: 1, z: 0 }] })
    );
    expect(result.actions[0]).toMatchObject({ type: 'check', kind: 'wall', result: true });
    expect(result.finalRobot.dir).toBe('N');
  });

  it('runs the else branch of if wall', () => {
    const program: Program = [
      { type: 'ifWall', then: [{ type: 'turn', dir: 'left' }], else: [{ type: 'move' }] }
    ];
    const result = executeProgram(program, challenge());
    expect(result.actions[0]).toMatchObject({ type: 'check', kind: 'wall', result: false });
    expect(result.finalRobot).toEqual({ x: 1, z: 0, dir: 'E' });
  });

  it('checks the goal ahead for if goal', () => {
    const program: Program = [
      { type: 'ifGoal', then: [{ type: 'move' }], else: [{ type: 'turn', dir: 'right' }] }
    ];
    const hit = executeProgram(program, challenge());
    expect(hit.status).toBe('incomplete');
    expect(hit.actions[0]).toMatchObject({ type: 'check', kind: 'goal', result: false });

    const ahead = executeProgram(program, challenge({ goal: { x: 1, z: 0 } }));
    expect(ahead.actions[0]).toMatchObject({ type: 'check', kind: 'goal', result: true });
    expect(ahead.status).toBe('success');
  });

  it('treats out of bounds as a wall check result', () => {
    const program: Program = [
      { type: 'ifWall', then: [{ type: 'turn', dir: 'left' }], else: [{ type: 'move' }] }
    ];
    const result = executeProgram(program, challenge({ robot: { x: 4, z: 0, dir: 'E' } }));
    expect(result.actions[0]).toMatchObject({ type: 'check', result: true });
    expect(result.finalRobot.dir).toBe('N');
  });
});

describe('interpreter collisions and limits', () => {
  it('stops at a wall with a friendly error', () => {
    const result = executeProgram(
      [{ type: 'move' }],
      challenge({ robot: { x: 0, z: 0, dir: 'E' }, walls: [{ x: 1, z: 0 }] })
    );
    expect(result.status).toBe('error');
    expect(result.actions).toHaveLength(2);
    expect(result.actions[0]).toMatchObject({ type: 'move', blocked: true, to: null });
    expect(result.actions[1]).toMatchObject({ type: 'error' });
    expect(result.error).toContain('벽');
    expect(result.finalRobot).toEqual({ x: 0, z: 0, dir: 'E' });
  });

  it('stops at the grid boundary with a friendly error', () => {
    const result = executeProgram(
      [{ type: 'move' }],
      challenge({ robot: { x: 4, z: 0, dir: 'E' } })
    );
    expect(result.status).toBe('error');
    expect(result.error).toContain('그리드 밖');
  });

  it('rejects repeats above the loop iteration limit', () => {
    const program: Program = [{ type: 'repeat', times: 101, body: [{ type: 'move' }] }];
    const result = executeProgram(program, challenge());
    expect(result.status).toBe('error');
    expect(result.actions[0]?.type).toBe('error');
    expect(result.error).toContain('100');
  });

  it('stops at the action limit', () => {
    const program: Program = [{ type: 'repeat', times: 5, body: [{ type: 'move' }] }];
    const result = executeProgram(program, challenge(), { ...DEFAULT_LIMITS, maxActions: 2 });
    expect(result.status).toBe('error');
    expect(result.error).toContain('동작');
    expect(result.actions).toHaveLength(3);
  });

  it('stops at the evaluation limit for pathological nesting', () => {
    const program: Program = [
      {
        type: 'repeat',
        times: 100,
        body: [
          {
            type: 'repeat',
            times: 100,
            body: [
              {
                type: 'repeat',
                times: 100,
                body: []
              }
            ]
          }
        ]
      }
    ];
    const result = executeProgram(program, challenge());
    expect(result.status).toBe('error');
    expect(result.error).toContain('실행 단계');
    expect(result.actions.length).toBeLessThanOrEqual(DEFAULT_LIMITS.maxActions + 1);
  });

  it('rejects nesting deeper than the limit', () => {
    let program: Program = [{ type: 'move' }];
    for (let i = 0; i < 6; i += 1) {
      program = [{ type: 'repeat', times: 1, body: program }];
    }
    const result = executeProgram(program, challenge());
    expect(result.status).toBe('error');
    expect(result.error).toContain('깊게');
  });

  it('returns success for an empty program on the goal', () => {
    const result = executeProgram(
      [],
      challenge({ robot: { x: 0, z: 0, dir: 'E' }, goal: { x: 0, z: 0 } })
    );
    expect(result.status).toBe('success');
    expect(result.actions).toHaveLength(0);
  });
});
