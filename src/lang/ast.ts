export type Direction = 'N' | 'E' | 'S' | 'W';

export interface Cell {
  x: number;
  z: number;
}

export interface RobotState extends Cell {
  dir: Direction;
}

export type Program = Statement[];

export type Statement =
  | { type: 'move'; id?: string }
  | { type: 'turn'; dir: 'left' | 'right'; id?: string }
  | { type: 'repeat'; times: number; body: Program; id?: string }
  | { type: 'ifWall'; then: Program; else?: Program; id?: string }
  | { type: 'ifGoal'; then: Program; else?: Program; id?: string };

export interface Challenge {
  id: string;
  titleKo: string;
  subtitleKo?: string;
  grid: { width: number; depth: number };
  robot: RobotState;
  goal: Cell;
  walls: Cell[];
  allowedBlocks: string[];
  parBlocks: number;
  hintKo: string;
  explanationKo: string;
  solution?: string;
}

export type BlockType =
  'bb_move' | 'bb_turn_left' | 'bb_turn_right' | 'bb_repeat' | 'bb_if_wall' | 'bb_if_goal';

export function blockTypeFromStatement(statement: Statement): BlockType {
  switch (statement.type) {
    case 'move':
      return 'bb_move';
    case 'turn':
      return statement.dir === 'left' ? 'bb_turn_left' : 'bb_turn_right';
    case 'repeat':
      return 'bb_repeat';
    case 'ifWall':
      return 'bb_if_wall';
    case 'ifGoal':
      return 'bb_if_goal';
  }
}

export function countBlocks(program: Program): number {
  let count = 0;
  for (const statement of program) {
    count += 1;
    if (statement.type === 'repeat') {
      count += countBlocks(statement.body);
    } else if (statement.type === 'ifWall' || statement.type === 'ifGoal') {
      count += countBlocks(statement.then);
      if (statement.else) count += countBlocks(statement.else);
    }
  }
  return count;
}

export function validateProgram(
  program: Program,
  depth = 1,
  maxDepth = 5
): { ok: true } | { ok: false; message: string } {
  if (depth > maxDepth) {
    return {
      ok: false,
      message: `블록이 너무 깊게 겹쳐 있어요. ${maxDepth}단계까지만 넣을 수 있어요.`
    };
  }
  for (const statement of program) {
    if (statement.type === 'repeat') {
      if (!Number.isInteger(statement.times) || statement.times < 0) {
        return { ok: false, message: '반복 횟수는 0 이상의 정수여야 해요.' };
      }
      const inner = validateProgram(statement.body, depth + 1, maxDepth);
      if (!inner.ok) return inner;
    } else if (statement.type === 'ifWall' || statement.type === 'ifGoal') {
      const thenResult = validateProgram(statement.then, depth + 1, maxDepth);
      if (!thenResult.ok) return thenResult;
      if (statement.else) {
        const elseResult = validateProgram(statement.else, depth + 1, maxDepth);
        if (!elseResult.ok) return elseResult;
      }
    }
  }
  return { ok: true };
}

export function summarizeProgram(program: Program): string {
  const parts: string[] = [];
  for (const statement of program) {
    switch (statement.type) {
      case 'move':
        parts.push('앞으로');
        break;
      case 'turn':
        parts.push(statement.dir === 'left' ? '왼쪽' : '오른쪽');
        break;
      case 'repeat':
        parts.push(`${statement.times}번 반복`);
        break;
      case 'ifWall':
        parts.push('벽이면');
        break;
      case 'ifGoal':
        parts.push('목표면');
        break;
    }
  }
  return parts.join(' · ');
}
