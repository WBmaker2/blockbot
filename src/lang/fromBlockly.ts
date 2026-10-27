import { MAX_LOOP_ITERATIONS, MAX_NESTING_DEPTH } from './limits';
import type { BlockType, Program, Statement } from './ast';

interface SerializedBlock {
  type?: unknown;
  id?: unknown;
  fields?: unknown;
  inputs?: unknown;
  next?: unknown;
}

interface SerializedWorkspace {
  blocks?: {
    blocks?: unknown[];
  };
}

export class ProgramBuildError extends Error {
  readonly blockId?: string;

  constructor(message: string, blockId?: string) {
    super(message);
    this.name = 'ProgramBuildError';
    this.blockId = blockId;
  }
}

export const BLOCK_TYPES: Record<BlockType, string> = {
  bb_move: 'move',
  bb_turn_left: 'turn_left',
  bb_turn_right: 'turn_right',
  bb_repeat: 'repeat',
  bb_if_wall: 'if_wall',
  bb_if_goal: 'if_goal'
};

export function fromBlocklyWorkspace(json: unknown): Program {
  const workspace = json as SerializedWorkspace;
  const rawBlocks = workspace?.blocks?.blocks;
  if (!Array.isArray(rawBlocks) || rawBlocks.length === 0) return [];

  const program: Program = [];
  const ordered = rawBlocks
    .filter((raw): raw is Record<string, unknown> => isRecord(raw))
    .map((raw, index) => ({ raw, index }))
    .sort((a, b) => {
      const ay = typeof a.raw.y === 'number' ? a.raw.y : 0;
      const by = typeof b.raw.y === 'number' ? b.raw.y : 0;
      if (ay !== by) return ay - by;
      const ax = typeof a.raw.x === 'number' ? a.raw.x : 0;
      const bx = typeof b.raw.x === 'number' ? b.raw.x : 0;
      if (ax !== bx) return ax - bx;
      return a.index - b.index;
    });

  for (const entry of ordered) {
    program.push(...convertStack(entry.raw as SerializedBlock, 1));
  }
  return program;
}

function convertStatement(block: SerializedBlock, depth: number): Statement | null {
  if (depth > MAX_NESTING_DEPTH) {
    throw new ProgramBuildError(
      `블록이 너무 깊게 겹쳐 있어요. ${MAX_NESTING_DEPTH}단계까지만 넣을 수 있어요.`,
      typeof block.id === 'string' ? block.id : undefined
    );
  }

  const type = block.type;
  if (typeof type !== 'string') {
    throw new ProgramBuildError('블록 종류를 읽을 수 없어요.');
  }

  const id = typeof block.id === 'string' ? block.id : undefined;

  switch (type) {
    case 'bb_move':
      return { type: 'move', id };
    case 'bb_turn_left':
      return { type: 'turn', dir: 'left', id };
    case 'bb_turn_right':
      return { type: 'turn', dir: 'right', id };
    case 'bb_repeat': {
      const rawTimes = readNumberInput(block.inputs, block.fields, 'TIMES');
      if (rawTimes === null) {
        throw new ProgramBuildError('반복할 횟수를 정해 주세요.', id);
      }
      if (!Number.isInteger(rawTimes) || rawTimes < 0) {
        throw new ProgramBuildError('반복 횟수는 0 이상의 정수여야 해요.', id);
      }
      if (rawTimes > MAX_LOOP_ITERATIONS) {
        throw new ProgramBuildError(`반복은 한 번에 ${MAX_LOOP_ITERATIONS}번까지 가능해요.`, id);
      }
      return {
        type: 'repeat',
        times: rawTimes,
        body: convertInputStack(block.inputs, 'DO', depth + 1),
        id
      };
    }
    case 'bb_if_wall':
    case 'bb_if_goal': {
      const thenBranch = convertInputStack(block.inputs, 'DO', depth + 1);
      const elseBlock = readInputBlock(block.inputs, 'ELSE');
      const elseBranch = elseBlock ? convertStack(elseBlock, depth + 1) : undefined;
      return {
        type: type === 'bb_if_wall' ? 'ifWall' : 'ifGoal',
        then: thenBranch,
        else: elseBranch,
        id
      };
    }
    default:
      throw new ProgramBuildError(
        `이 앱에서 알 수 없는 블록이에요: ${type}. 블록을 지우고 다시 만들어 주세요.`,
        id
      );
  }
}

function convertInputStack(inputs: unknown, name: string, depth: number): Program {
  const block = readInputBlock(inputs, name);
  if (!block) return [];
  return convertStack(block, depth);
}

function convertStack(first: SerializedBlock, depth: number): Program {
  const program: Program = [];
  let current: SerializedBlock | undefined = first;
  let guard = 0;

  while (current) {
    guard += 1;
    if (guard > 5000) {
      throw new ProgramBuildError('블록 연결이 너무 길어요. 블록을 나눠 주세요.');
    }
    const statement = convertStatement(current, depth);
    if (statement) program.push(statement);

    const next = current.next;
    if (isRecord(next) && isRecord(next.block)) {
      current = next.block as SerializedBlock;
    } else {
      current = undefined;
    }
  }
  return program;
}

function readInputBlock(inputs: unknown, name: string): SerializedBlock | null {
  if (!isRecord(inputs)) return null;
  const input = inputs[name];
  if (!isRecord(input)) return null;
  if (isRecord(input.block)) return input.block as SerializedBlock;
  if (isRecord(input.shadow)) return input.shadow as SerializedBlock;
  return null;
}

function readNumberInput(inputs: unknown, fields: unknown, name: string): number | null {
  const block = readInputBlock(inputs, name);
  const inputFields = block && isRecord(block.fields) ? block.fields : null;
  const fieldValue = isRecord(fields) ? fields[name] : undefined;
  const raw = inputFields?.NUM ?? fieldValue;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
