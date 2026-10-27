import { describe, expect, it } from 'vitest';
import { fromBlocklyWorkspace, ProgramBuildError } from '../../src/lang/fromBlockly';

function workspace(blocks: unknown[]): unknown {
  return { blocks: { languageVersion: 0, blocks } };
}

describe('Blockly workspace to AST', () => {
  it('converts move and turn blocks', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        { type: 'bb_move', id: 'a' },
        {
          type: 'bb_turn_left',
          id: 'b',
          next: { block: { type: 'bb_turn_right', id: 'c' } }
        }
      ])
    );
    expect(program).toEqual([
      { type: 'move', id: 'a' },
      { type: 'turn', dir: 'left', id: 'b' },
      { type: 'turn', dir: 'right', id: 'c' }
    ]);
  });

  it('converts repeat with a field number', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        {
          type: 'bb_repeat',
          id: 'r',
          fields: { TIMES: 3 },
          inputs: { DO: { block: { type: 'bb_move', id: 'm' } } }
        }
      ])
    );
    expect(program).toEqual([
      {
        type: 'repeat',
        times: 3,
        id: 'r',
        body: [{ type: 'move', id: 'm' }]
      }
    ]);
  });

  it('converts repeat with a shadow number input', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        {
          type: 'bb_repeat',
          id: 'r',
          inputs: {
            TIMES: { shadow: { type: 'math_number', fields: { NUM: 2 } } },
            DO: { block: { type: 'bb_move' } }
          }
        }
      ])
    );
    expect(program[0]).toMatchObject({ type: 'repeat', times: 2, body: [{ type: 'move' }] });
  });

  it('converts if wall with then and else', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        {
          type: 'bb_if_wall',
          id: 'i',
          inputs: {
            DO: { block: { type: 'bb_turn_right', id: 't' } },
            ELSE: { block: { type: 'bb_move', id: 'm' } }
          }
        }
      ])
    );
    expect(program).toEqual([
      {
        type: 'ifWall',
        id: 'i',
        then: [{ type: 'turn', dir: 'right', id: 't' }],
        else: [{ type: 'move', id: 'm' }]
      }
    ]);
  });

  it('converts if goal with an empty else', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        {
          type: 'bb_if_goal',
          id: 'g',
          inputs: { DO: { block: { type: 'bb_move', id: 'm' } } }
        }
      ])
    );
    expect(program).toEqual([
      { type: 'ifGoal', id: 'g', then: [{ type: 'move', id: 'm' }], else: undefined }
    ]);
  });

  it('orders top-level blocks by their vertical position', () => {
    const program = fromBlocklyWorkspace(
      workspace([
        { type: 'bb_move', id: 'bottom', y: 220, x: 10 },
        { type: 'bb_turn_left', id: 'top', y: 80, x: 10 }
      ])
    );
    expect(program.map((statement) => statement.id)).toEqual(['top', 'bottom']);
  });

  it('returns an empty program for a blank workspace', () => {
    expect(fromBlocklyWorkspace(workspace([]))).toEqual([]);
    expect(fromBlocklyWorkspace({})).toEqual([]);
  });

  it('rejects unknown block types', () => {
    expect(() => fromBlocklyWorkspace(workspace([{ type: 'bb_fly', id: 'x' }]))).toThrow(
      ProgramBuildError
    );
  });

  it('rejects missing and invalid repeat counts', () => {
    expect(() =>
      fromBlocklyWorkspace(workspace([{ type: 'bb_repeat', id: 'r', inputs: {} }]))
    ).toThrow(/횟수/);
    expect(() =>
      fromBlocklyWorkspace(workspace([{ type: 'bb_repeat', id: 'r', fields: { TIMES: 101 } }]))
    ).toThrow(/100/);
  });

  it('rejects nesting deeper than five levels', () => {
    let block: Record<string, unknown> = { type: 'bb_move' };
    for (let i = 0; i < 6; i += 1) {
      block = { type: 'bb_repeat', fields: { TIMES: 1 }, inputs: { DO: { block } } };
    }
    expect(() => fromBlocklyWorkspace(workspace([block]))).toThrow(/깊게/);
  });
});
