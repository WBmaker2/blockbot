export const MAX_ACTIONS = 500;
export const MAX_EVAL_STEPS = 10_000;
export const MAX_LOOP_ITERATIONS = 100;
export const MAX_NESTING_DEPTH = 5;
export const ANIMATION_MS = 220;

export const LIMITS = {
  maxActions: MAX_ACTIONS,
  maxEvalSteps: MAX_EVAL_STEPS,
  maxLoopIterations: MAX_LOOP_ITERATIONS,
  maxNestingDepth: MAX_NESTING_DEPTH,
  animationMs: ANIMATION_MS
} as const;

export type Limits = {
  maxActions: number;
  maxEvalSteps: number;
  maxLoopIterations: number;
  maxNestingDepth: number;
};

export const DEFAULT_LIMITS: Limits = {
  maxActions: MAX_ACTIONS,
  maxEvalSteps: MAX_EVAL_STEPS,
  maxLoopIterations: MAX_LOOP_ITERATIONS,
  maxNestingDepth: MAX_NESTING_DEPTH
};
