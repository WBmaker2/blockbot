import type { Cell, Direction } from './ast';

export type Action =
  | {
      type: 'move';
      from: Cell;
      to: Cell | null;
      dir: Direction;
      blocked: boolean;
      blockId?: string;
    }
  | {
      type: 'turn';
      dir: 'left' | 'right';
      from: Direction;
      to: Direction;
      blockId?: string;
    }
  | {
      type: 'check';
      kind: 'wall' | 'goal';
      result: boolean;
      blockId?: string;
    }
  | {
      type: 'error';
      message: string;
      blockId?: string;
    };

export function describeAction(action: Action): string {
  switch (action.type) {
    case 'move':
      return action.blocked ? '앞으로 → 막힘' : '앞으로 → 이동';
    case 'turn':
      return action.dir === 'left' ? '왼쪽으로 회전' : '오른쪽으로 회전';
    case 'check':
      return action.kind === 'wall'
        ? action.result
          ? '벽 확인 → 참'
          : '벽 확인 → 거짓'
        : action.result
          ? '목표 확인 → 참'
          : '목표 확인 → 거짓';
    case 'error':
      return `멈춤: ${action.message}`;
  }
}

export function toTranscript(actions: Action[]): string {
  if (actions.length === 0) return '아직 실행한 동작이 없어요.';
  return actions.map(describeAction).join(', ');
}
