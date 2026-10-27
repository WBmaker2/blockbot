import type { Cell, Direction, RobotState } from '../lang/ast';

export const DIRECTIONS: Direction[] = ['N', 'E', 'S', 'W'];

export const DIRECTION_VECTORS: Record<Direction, Cell> = {
  N: { x: 0, z: -1 },
  E: { x: 1, z: 0 },
  S: { x: 0, z: 1 },
  W: { x: -1, z: 0 }
};

export const DIRECTION_LABELS_KO: Record<Direction, string> = {
  N: '북쪽',
  E: '동쪽',
  S: '남쪽',
  W: '서쪽'
};

export function createRobot(robot: RobotState): RobotState {
  return { x: robot.x, z: robot.z, dir: robot.dir };
}

export function cloneRobot(robot: RobotState): RobotState {
  return { x: robot.x, z: robot.z, dir: robot.dir };
}

export function forward(cell: Cell, dir: Direction): Cell {
  const vector = DIRECTION_VECTORS[dir];
  return { x: cell.x + vector.x, z: cell.z + vector.z };
}

export function frontCell(robot: RobotState): Cell {
  return forward(robot, robot.dir);
}

export function turnLeft(dir: Direction): Direction {
  const index = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(index + 3) % 4];
}

export function turnRight(dir: Direction): Direction {
  const index = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(index + 1) % 4];
}

export function moved(robot: RobotState): RobotState {
  const next = forward(robot, robot.dir);
  return { ...next, dir: robot.dir };
}

export function turned(robot: RobotState, direction: 'left' | 'right'): RobotState {
  return {
    ...robot,
    dir: direction === 'left' ? turnLeft(robot.dir) : turnRight(robot.dir)
  };
}

export function yawForDirection(dir: Direction): number {
  switch (dir) {
    case 'N':
      return Math.PI;
    case 'E':
      return Math.PI / 2;
    case 'S':
      return 0;
    case 'W':
      return -Math.PI / 2;
  }
}
