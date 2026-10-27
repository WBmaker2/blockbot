import { describe, expect, it } from 'vitest';
import { parseTextProgram, formatProgram, TextSyntaxError } from '../../src/lang/textMode';

describe('text mode parser', () => {
  it('parses a sequence', () => {
    expect(parseTextProgram('move\nleft\nright')).toEqual([
      { type: 'move', id: 'text-1-1' },
      { type: 'turn', dir: 'left', id: 'text-2-2' },
      { type: 'turn', dir: 'right', id: 'text-3-3' }
    ]);
  });

  it('parses repeat blocks', () => {
    const program = parseTextProgram('repeat 4 { move }');
    expect(program).toHaveLength(1);
    expect(program[0]).toMatchObject({ type: 'repeat', times: 4, body: [{ type: 'move' }] });
  });

  it('parses if/else blocks', () => {
    const program = parseTextProgram('if wall { right } else { move }');
    expect(program[0]).toMatchObject({
      type: 'ifWall',
      then: [{ type: 'turn', dir: 'right' }],
      else: [{ type: 'move' }]
    });
  });

  it('parses Korean aliases', () => {
    const program = parseTextProgram('반복 2 { 앞으로 }\n만약 벽 { 오른쪽 } 아니면 { 왼쪽 }');
    expect(program[0]).toMatchObject({ type: 'repeat', times: 2 });
    expect(program[1]).toMatchObject({ type: 'ifWall' });
  });

  it('ignores comments and blank lines', () => {
    expect(parseTextProgram('# 시작\n\nmove # 이동\n')).toHaveLength(1);
  });

  it('formats a program back to text', () => {
    const program = parseTextProgram('repeat 2 { if goal { move } else { left } }');
    const text = formatProgram(program);
    expect(text).toContain('repeat 2 {');
    expect(text).toContain('if goal {');
    expect(text).toContain('else {');
    expect(stripIds(parseTextProgram(text))).toEqual(stripIds(program));
  });

  it('reports the line of a syntax error', () => {
    try {
      parseTextProgram('move\nrepeat { move }');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TextSyntaxError);
      expect((error as TextSyntaxError).message).toContain('2번째 줄');
    }
  });

  it('rejects unknown actions', () => {
    expect(() => parseTextProgram('jump')).toThrow(/알 수 없는 동작/);
  });

  it('rejects an else without an if', () => {
    expect(() => parseTextProgram('else { move }')).toThrow(/else/);
  });

  it('rejects over-limit repeat counts and nesting', () => {
    expect(() => parseTextProgram('repeat 101 { move }')).toThrow(/100/);
    let source = 'move';
    for (let i = 0; i < 6; i += 1) source = `repeat 1 { ${source} }`;
    expect(() => parseTextProgram(source)).toThrow(/깊게/);
  });

  it('accepts the same challenge solution in text form', () => {
    const program = parseTextProgram('repeat 2 { repeat 2 { move } right }');
    expect(program[0]).toMatchObject({ type: 'repeat' });
  });
});

function stripIds(program: ReturnType<typeof parseTextProgram>): unknown {
  return program.map((statement) => {
    const { id: _id, ...rest } = statement as Record<string, unknown>;
    if (statement.type === 'repeat') {
      return { ...rest, body: stripIds(statement.body) };
    }
    if (statement.type === 'ifWall' || statement.type === 'ifGoal') {
      return {
        ...rest,
        then: stripIds(statement.then),
        else: statement.else ? stripIds(statement.else) : undefined
      };
    }
    return rest;
  });
}
