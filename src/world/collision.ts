import type { RobotState } from '../lang/ast';
import type { Grid } from './grid';
import { frontCell } from './robot';

export function isWallAhead(robot: RobotState, grid: Grid): boolean {
  return grid.isBlocked(frontCell(robot));
}

export function isInsideAhead(robot: RobotState, grid: Grid): boolean {
  return grid.isInside(frontCell(robot));
}
