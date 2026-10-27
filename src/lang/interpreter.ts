import type { Action } from './actions';
import {
  validateProgram,
  type Challenge,
  type Program,
  type RobotState,
  type Statement
} from './ast';
import { DEFAULT_LIMITS, type Limits } from './limits';
import { Grid } from '../world/grid';
import { forward, turnLeft, turnRight } from '../world/robot';
import { isAtGoal, isGoalAhead } from '../world/goal';

export type ExecutionStatus = 'success' | 'error' | 'incomplete';

export interface ExecutionResult {
  actions: Action[];
  finalRobot: RobotState;
  status: ExecutionStatus;
  error?: string;
  errorBlockId?: string;
  evalSteps: number;
  goalReached: boolean;
}

interface Runtime {
  actions: Action[];
  robot: RobotState;
  evalSteps: number;
  error?: string;
  errorBlockId?: string;
  stopped: boolean;
}

export function executeProgram(
  program: Program,
  challenge: Challenge,
  limits: Limits = DEFAULT_LIMITS
): ExecutionResult {
  const grid = new Grid(
    challenge.grid.width,
    challenge.grid.depth,
    challenge.walls,
    challenge.goal
  );
  const runtime: Runtime = {
    actions: [],
    robot: { x: challenge.robot.x, z: challenge.robot.z, dir: challenge.robot.dir },
    evalSteps: 0,
    stopped: false
  };

  const validation = validateProgram(program, 1, limits.maxNestingDepth);
  if (!validation.ok) {
    runtime.actions.push({ type: 'error', message: validation.message });
    runtime.error = validation.message;
    return finish(runtime, challenge);
  }

  runProgram(program, 1, runtime, grid, limits);

  if (!runtime.error && !runtime.stopped) {
    runtime.stopped = true;
  }

  return finish(runtime, challenge);
}

function finish(runtime: Runtime, challenge: Challenge): ExecutionResult {
  const goalReached = isAtGoal(runtime.robot, challenge.goal);
  const status: ExecutionStatus = runtime.error ? 'error' : goalReached ? 'success' : 'incomplete';

  return {
    actions: runtime.actions,
    finalRobot: { ...runtime.robot },
    status,
    error: runtime.error,
    errorBlockId: runtime.errorBlockId,
    evalSteps: runtime.evalSteps,
    goalReached
  };
}

function runProgram(
  program: Program,
  depth: number,
  runtime: Runtime,
  grid: Grid,
  limits: Limits
): boolean {
  if (runtime.stopped) return false;
  if (depth > limits.maxNestingDepth) {
    return fail(
      runtime,
      `블록이 너무 깊게 겹쳐 있어요. ${limits.maxNestingDepth}단계까지만 실행할 수 있어요.`
    );
  }

  for (const statement of program) {
    if (runtime.stopped) return false;
    if (!countStep(runtime, limits, statement.id)) return false;
    if (!runStatement(statement, depth, runtime, grid, limits)) return false;
  }
  return true;
}

function runStatement(
  statement: Statement,
  depth: number,
  runtime: Runtime,
  grid: Grid,
  limits: Limits
): boolean {
  switch (statement.type) {
    case 'move': {
      const target = forward(runtime.robot, runtime.robot.dir);
      if (grid.isBlocked(target)) {
        const message = grid.isInside(target)
          ? '앞에 벽이 있어요! 로봇이 부딪혔어요.'
          : '로봇이 그리드 밖으로 나가려고 해요. 방향을 확인해 보세요.';
        const emitted = pushAction(
          runtime,
          limits,
          {
            type: 'move',
            from: { x: runtime.robot.x, z: runtime.robot.z },
            to: null,
            dir: runtime.robot.dir,
            blocked: true,
            blockId: statement.id
          },
          statement.id
        );
        if (!emitted) return false;
        return fail(runtime, message, statement.id);
      }
      const from = { x: runtime.robot.x, z: runtime.robot.z };
      const emitted = pushAction(
        runtime,
        limits,
        {
          type: 'move',
          from,
          to: { ...target },
          dir: runtime.robot.dir,
          blocked: false,
          blockId: statement.id
        },
        statement.id
      );
      if (!emitted) return false;
      runtime.robot = { x: target.x, z: target.z, dir: runtime.robot.dir };
      return true;
    }
    case 'turn': {
      const from = runtime.robot.dir;
      const to = statement.dir === 'left' ? turnLeft(from) : turnRight(from);
      const emitted = pushAction(
        runtime,
        limits,
        { type: 'turn', dir: statement.dir, from, to, blockId: statement.id },
        statement.id
      );
      if (!emitted) return false;
      runtime.robot = { ...runtime.robot, dir: to };
      return true;
    }
    case 'repeat': {
      if (!Number.isInteger(statement.times) || statement.times < 0) {
        return fail(runtime, '반복 횟수는 0 이상의 정수여야 해요.', statement.id);
      }
      if (statement.times > limits.maxLoopIterations) {
        return fail(
          runtime,
          `한 번에 ${limits.maxLoopIterations}번까지만 반복할 수 있어요. 반복을 나눠 보세요.`,
          statement.id
        );
      }
      for (let i = 0; i < statement.times; i += 1) {
        if (!countStep(runtime, limits, statement.id)) return false;
        if (!runProgram(statement.body, depth + 1, runtime, grid, limits)) return false;
      }
      return true;
    }
    case 'ifWall': {
      const result = grid.isBlocked(forward(runtime.robot, runtime.robot.dir));
      const emitted = pushAction(
        runtime,
        limits,
        { type: 'check', kind: 'wall', result, blockId: statement.id },
        statement.id
      );
      if (!emitted) return false;
      const branch = result ? statement.then : statement.else;
      return branch ? runProgram(branch, depth + 1, runtime, grid, limits) : true;
    }
    case 'ifGoal': {
      const result = isGoalAhead(runtime.robot, grid.goal);
      const emitted = pushAction(
        runtime,
        limits,
        { type: 'check', kind: 'goal', result, blockId: statement.id },
        statement.id
      );
      if (!emitted) return false;
      const branch = result ? statement.then : statement.else;
      return branch ? runProgram(branch, depth + 1, runtime, grid, limits) : true;
    }
  }
}

function countStep(runtime: Runtime, limits: Limits, blockId?: string): boolean {
  runtime.evalSteps += 1;
  if (runtime.evalSteps > limits.maxEvalSteps) {
    return fail(
      runtime,
      `프로그램이 너무 오래 걸려요. 실행 단계 ${limits.maxEvalSteps}개를 넘었어요. 반복을 줄여 보세요.`,
      blockId
    );
  }
  return true;
}

function pushAction(runtime: Runtime, limits: Limits, action: Action, blockId?: string): boolean {
  if (runtime.actions.length >= limits.maxActions) {
    return fail(
      runtime,
      `동작이 너무 많아요. 한 번에 ${limits.maxActions}개까지만 실행할 수 있어요.`,
      blockId
    );
  }
  runtime.actions.push(action);
  return true;
}

function fail(runtime: Runtime, message: string, blockId?: string): boolean {
  if (runtime.stopped) return false;
  runtime.stopped = true;
  runtime.error = message;
  runtime.errorBlockId = blockId;
  runtime.actions.push({ type: 'error', message, blockId });
  return false;
}
