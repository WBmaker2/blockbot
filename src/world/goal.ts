import type { Cell, RobotState } from '../lang/ast';
import { sameCell } from './grid';
import { frontCell } from './robot';

export function isAtGoal(robot: RobotState, goal: Cell): boolean {
  return sameCell(robot, goal);
}

export function isGoalAhead(robot: RobotState, goal: Cell): boolean {
  return sameCell(frontCell(robot), goal);
}
