# BlockBot — Implementation Plan

**Project name:** BlockBot
**Folder:** `/Volumes/ External Drive 256G/Dev2/opencode/blockbot`
**Type:** Static educational SPA/PWA
**Runtime AI:** None. No LLM/API calls after build. All code execution runs locally.
**Target learners:** Grades 4–9 (Korean 초4~중3)
**Subject:** Informatics and mathematics — sequencing, loops, conditionals, coordinates, debugging
**MVP duration:** 4–5 weeks

---

## 0. One-page summary

BlockBot is a block-based coding environment where a student's program moves a robot on a small 3D grid. The student drags blocks, presses Run, and watches the robot execute the program step by step. When it fails, the app shows exactly which block was executing and why.

The design has three layers:

1. **Blocks** — a small, focused language: move, turn, repeat, and wall check.
2. **Interpreter** — a safe AST interpreter with a step budget; no `eval`.
3. **World** — a 5×5 or 6×6 grid with walls, a goal, and a simple robot.

The app is **not** an AI tutor. Feedback is deterministic and tied to the program and the world state.

**Why this is a strong build**

- It teaches coding with a coding-built app.
- A parser/interpreter + 3D visualization + block editor is a serious engineering showcase.
- Every execution is reproducible and testable.
- The challenge content is simple to author and extend.
- The text-mode alternative makes the app accessible and doubles as a debugging tool.

---

## 1. Product definition

### 1.1 Learning problem

Beginners can copy a block sequence but struggle to predict what a loop or condition will do. They also lack a mental model of program execution: which block runs next, why a loop stops, and why a condition takes one branch.

### 1.2 Learning goals

By the end of the core challenges, a student should be able to:

- Read and write a sequence of instructions.
- Use a repeat block to remove duplication.
- Use a condition to react to a wall.
- Track the robot's position and direction on a grid.
- Debug a failing program by stepping through it.
- Improve a working program by reducing the number of blocks.

### 1.3 Core learning loop

1. **Plan** — read the challenge and predict the path.
2. **Build** — drag blocks into the workspace.
3. **Run** — watch the robot execute, or step one action at a time.
4. **Debug** — inspect the highlighted block and the robot state.
5. **Optimize** — solve it again with fewer blocks.

### 1.4 Success criteria

- A student can solve a straight-line challenge with a sequence.
- A student can replace four move blocks with a repeat block.
- A student can explain why an `if wall` branch did or did not run.
- A student can debug a collision using step mode.
- A teacher can reset progress and select challenges without code changes.

---

## 2. Scope

### MVP (must ship)

- Blockly-based block editor with a restricted toolbox.
- Blocks: move forward, turn left, turn right, repeat, if wall ahead / else, if goal ahead.
- 3D grid world with walls, a goal, and a robot.
- Run, pause, step, and reset.
- Collision detection, out-of-bounds detection, and goal detection.
- Step budget and loop-iteration limit to stop infinite programs.
- Highlight of the currently executing block.
- Status panel: position, direction, last action, result.
- Ten challenges with par block counts and hints.
- Star rating by block count.
- Local progress and teacher reset.
- Text-mode alternative that compiles to the same AST.
- Responsive layout, keyboard support, reduced motion.
- PWA install + offline cache.

### Later (do not build in the first pass)

- Multiple robots or parallel programs.
- Functions and variables.
- While loops.
- Collectibles, keys, and doors.
- Level editor.
- Program sharing via URL.
- Classroom accounts.

### Out of scope

- Any server, database, login, or analytics.
- Any runtime AI or generated hints.
- Arbitrary JavaScript execution or `eval`.
- A full 3D physics engine.
- Multiplayer.

---

## 3. Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Build | Vite + TypeScript | Static output, fast iteration |
| Blocks | Blockly | Mature block editor with keyboard support |
| 3D | Three.js | Grid, robot, camera |
| UI | Vanilla DOM + CSS custom properties | Simple layout around Blockly |
| Tests | Vitest + Playwright | Interpreter and interaction tests |
| PWA | `vite-plugin-pwa` | Offline classroom use |
| Hosting | GitHub Pages / Cloudflare Pages | No server |

**Constraints**

- Node.js 20+.
- No backend, no API keys, no runtime network calls.
- No `eval`, `new Function`, or generated JavaScript execution. Interpret the block tree directly.
- Keep the grid at 6×6 or smaller in the MVP.
- Target 60 fps on a mid-range laptop; ≥ 30 fps on a school tablet.
- Initial gzip bundle under 1 MB (Blockly is the largest dependency).

---

## 4. Architecture

### 4.1 Module map

```text
src/
  main.ts
  app/
    App.ts
    state.ts
    routes.ts
  blocks/
    toolbox.ts
    definitions.ts
    theme.ts
    workspace.ts
  lang/
    ast.ts
    fromBlockly.ts
    interpreter.ts
    actions.ts
    textMode.ts
    limits.ts
  world/
    grid.ts
    robot.ts
    collision.ts
    goal.ts
  render/
    SceneManager.ts
    GridView.ts
    RobotView.ts
    WallView.ts
    GoalView.ts
    CameraRig.ts
  ui/
    Layout.ts
    EditorPanel.ts
    Controls.ts
    ChallengePanel.ts
    StatusBar.ts
    BlockHighlight.ts
  features/
    challenges/
    teacher/
  data/
    challenges.json
  storage/
    progress.ts
  tests/
    unit/
    e2e/
```

### 4.2 Separation of concerns

- **Blocks** produce a serializable workspace JSON.
- **`fromBlockly`** converts that JSON to the app's own AST.
- **Interpreter** executes the AST and yields actions.
- **World** applies actions and checks rules.
- **Render** animates the resulting states.
- **UI** controls the flow and displays status.

The interpreter and world must be pure TypeScript with no Three.js or Blockly imports. This makes them testable in Node.

### 4.3 State

```ts
interface AppState {
  route: 'play' | 'challenges' | 'teacher';
  challengeId: string;
  workspaceJson: object | null;
  program: Program | null;       // AST
  execution: {
    status: 'idle' | 'running' | 'paused' | 'success' | 'error';
    actions: Action[];           // precomputed action queue
    index: number;
    error?: string;
  };
  robot: {
    x: number;
    z: number;
    dir: Direction;
  };
  ui: {
    mode: 'blocks' | 'text';
    speed: 'slow' | 'normal' | 'fast';
    showGrid: boolean;
  };
  progress: {
    completed: Record<string, number>;  // challenge id -> stars
  };
  preferences: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
}
```

### 4.4 Persistence

- `localStorage` key: `blockbot.progress.v1`.
- Store completed challenges, stars, last challenge, and preferences.
- Optionally store the last workspace per challenge.
- No personal data.
- Teacher reset clears progress after confirmation.

---

## 5. Data model

### 5.1 Grid and robot

```ts
type Direction = 'N' | 'E' | 'S' | 'W';

interface Cell {
  x: number;
  z: number;
}

interface Challenge {
  id: string;
  titleKo: string;
  grid: { width: number; depth: number };
  robot: { x: number; z: number; dir: Direction };
  goal: Cell;
  walls: Cell[];
  allowedBlocks: string[];
  parBlocks: number;
  hintKo: string;
  explanationKo: string;
}
```

### 5.2 AST

```ts
type Program = Statement[];

type Statement =
  | { type: 'move' }
  | { type: 'turn'; dir: 'left' | 'right' }
  | { type: 'repeat'; times: number; body: Program }
  | { type: 'ifWall'; then: Program; else?: Program }
  | { type: 'ifGoal'; then: Program; else?: Program };
```

### 5.3 Action

```ts
type Action =
  | { type: 'move'; from: Cell; to: Cell | null; blocked: boolean }
  | { type: 'turn'; from: Direction; to: Direction }
  | { type: 'check'; kind: 'wall' | 'goal'; result: boolean }
  | { type: 'error'; message: string };
```

Each action carries enough data to animate and to explain what happened.

### 5.4 Limits

```ts
const MAX_ACTIONS = 500;
const MAX_EVAL_STEPS = 10000;
const MAX_LOOP_ITERATIONS = 100;
const MAX_NESTING_DEPTH = 5;
const ANIMATION_MS = 220;
```

Limits are mandatory. A block program must never freeze the tab.

---

## 6. Core algorithms

### 6.1 Blockly to AST

1. Serialize the Blockly workspace to JSON.
2. Walk the top-level statement blocks.
3. Map each block type to an AST node.
4. Validate required fields (e.g. repeat count is a positive integer).
5. Reject unknown block types with a clear error.
6. Enforce `MAX_NESTING_DEPTH`.

Do not generate JavaScript and run it. The AST is the only executable form.

### 6.2 Interpreter

Use a generator or an explicit continuation so the interpreter can yield one action at a time:

```text
execute(program):
  for each statement:
    yield* executeStatement(statement)

executeStatement(move):
  target = forward(robot)
  if blocked or out of bounds:
    yield error; stop
  yield move; update robot

executeStatement(repeat):
  for i in 0..times-1:
    if loop iterations exceed limit: yield error; stop
    yield* executeStatement(body)
```

The interpreter must be deterministic and side-effect free until an action is applied.

### 6.3 Direction and movement

- `N = (0, -1)`, `E = (1, 0)`, `S = (0, 1)`, `W = (-1, 0)` in grid coordinates.
- Turn left: `N -> W -> S -> E -> N`.
- Turn right: `N -> E -> S -> W -> N`.
- Move forward adds the direction vector.
- Reject moves outside the grid or into a wall.
- A blocked move is an error for the MVP; later, it can be a "bump" that does not move.

### 6.4 Collision and goal checks

- Wall check: the cell in front of the robot is a wall.
- Goal check: the robot's current cell equals the goal cell.
- Success: the robot reaches the goal without an error.
- The program may end before reaching the goal; show "not at goal" rather than an error.

### 6.5 Step budget and infinite loops

- Count every evaluated statement and every loop iteration.
- Stop with a friendly error when a limit is reached.
- Show which block was executing when the limit was hit.
- Never rely on a browser timeout to stop a program.

### 6.6 Animation

- Precompute the action list, then play it at a fixed speed.
- Move: interpolate the robot between cells over `ANIMATION_MS`.
- Turn: interpolate the robot's yaw.
- Highlight the source block for the current action using Blockly's highlight API.
- In reduced-motion mode, jump instantly and only update the highlight.
- Keep a queue so pause/resume and step mode share the same path.

### 6.7 Star rating

- 3 stars: solved with block count ≤ `parBlocks`.
- 2 stars: solved with block count ≤ `parBlocks + 2`.
- 1 star: solved with any block count.
- Do not award stars for an unsolved challenge.
- Show the block count and the par count.

### 6.8 Text mode

Provide a simple text syntax that maps to the same AST:

```text
move
left
repeat 4 { move }
if wall { right } else { move }
```

- Parse with a small tokenizer and recursive-descent parser.
- Show syntax errors with line numbers.
- Text mode is an accessibility path and a debugging aid, not a replacement for blocks.

---

## 7. Screens and UX

### 7.1 Play screen

- Left: Blockly workspace with a restricted toolbox.
- Right: 3D grid world.
- Bottom: Run, Pause, Step, Reset, speed selector.
- Top: challenge title and goal.
- Status bar: position, direction, last action, result.

### 7.2 Challenge screen

- Challenge list with stars.
- Each challenge opens the play screen with a preset world.
- A short hint is available after the first failed run.
- The explanation appears after success.

### 7.3 Teacher mode

- Select challenges.
- Show solutions and explanations.
- Reset progress.
- Toggle grid coordinates and block highlighting.
- Print a worksheet with the grid and the goal.

### 7.4 Responsive layout

**Desktop (≥ 1024 px)**

- 50/50 split between blocks and 3D world.
- Bottom control bar.

**Tablet (768–1023 px)**

- 55/45 split; larger Blockly zoom controls.
- Controls as a bottom bar.

**Phone (< 768 px)**

- Tabs: Blocks | World.
- The Run button is sticky at the bottom.
- Blockly workspace uses a simplified toolbox.
- The 3D camera uses a fixed isometric view to avoid complex touch gestures.

### 7.5 Accessibility

- Blockly keyboard navigation and screen-reader support.
- Text mode as a fully keyboard-accessible alternative.
- Status updates via `aria-live`: position, direction, result.
- High-contrast mode.
- Reduced motion: instant moves, no camera animation.
- Grid coordinates available as text.
- Do not rely on color alone for walls, goal, or robot direction.
- Provide a text transcript of the last run: "move, move, turn left, blocked."

---

## 8. Implementation milestones

### M0 — Setup (0.5 day)

- Scaffold Vite + TypeScript.
- Add Blockly, Three.js, Vitest, Playwright, ESLint, Prettier, PWA plugin.
- Create the module map and a blank split layout.
- **Verify:** dev server, build, and tests run.

### M1 — World and rules (2–3 days)

- Implement grid, direction, movement, walls, and goal.
- Write unit tests for movement, turning, collisions, and bounds.
- **Verify:** a scripted sequence moves the robot correctly.

### M2 — AST and interpreter (3–4 days)

- Define the AST and the action types.
- Implement the interpreter with limits and error reporting.
- Write tests for sequences, repeats, nested repeats, wall conditions, and infinite loops.
- **Verify:** every program terminates and produces the expected actions.

### M3 — Blockly integration (3–4 days)

- Define the custom blocks and toolbox.
- Implement Blockly JSON → AST conversion.
- Add validation and friendly errors.
- **Verify:** every allowed block compiles to the correct AST.

### M4 — 3D world (3–4 days)

- Build the grid, walls, goal, and robot.
- Add an isometric camera and a simple orbit.
- Animate moves and turns.
- Highlight the current block.
- **Verify:** the animation matches the action list exactly.

### M5 — Controls and status (2 days)

- Add Run, Pause, Step, Reset, and speed.
- Add the status bar and error messages.
- Add success detection and star rating.
- **Verify:** run, pause, step, and reset work in any order.

### M6 — Challenges and teacher mode (2–3 days)

- Author ten challenges with par counts and hints.
- Add progress persistence and teacher reset.
- Add the challenge list and explanation cards.
- **Verify:** every challenge is solvable and scored correctly.

### M7 — Text mode (2 days)

- Implement the tokenizer, parser, and error messages.
- Map text mode to the same AST.
- Add a toggle between blocks and text.
- **Verify:** the same challenge can be solved in both modes.

### M8 — Responsive, accessibility, PWA (2–3 days)

- Implement the three layouts.
- Add keyboard navigation, text transcript, high contrast, reduced motion.
- Configure offline caching.
- **Verify:** keyboard-only challenge completion; offline reload.

### M9 — QA and pilot (2 days)

- Run all tests and screenshot checks.
- Test on a low-end tablet.
- Ask 3–5 students to try the first three challenges.
- Fix the top usability issues.
- Deploy.
- **Verify:** acceptance criteria below are met.

---

## 9. Testing and verification

### Unit tests (Vitest)

- Direction and turn mappings.
- Move forward for each direction.
- Collision with walls and grid bounds.
- Goal detection.
- Sequence execution.
- Repeat with 0, 1, and many iterations.
- Nested repeats.
- `if wall` true and false branches.
- `if goal` true and false branches.
- Loop limit and action limit.
- Blockly JSON → AST conversion for every block.
- Text mode parser for valid and invalid programs.
- Star rating thresholds.

### Interaction tests (Playwright)

- Drag a block into the workspace and run it.
- Step through a program and confirm the highlight moves.
- Pause and resume.
- Collide with a wall and see the error.
- Solve a challenge and see the stars.
- Reset progress in teacher mode.
- Switch to text mode and solve the same challenge.
- Keyboard-only path through the first challenge.

### Visual tests

- Screenshot the default world, a success state, and a collision state.
- Screenshot the block highlight during a run.
- Run at 1440×900, 1024×768, and 390×844.
- Check that Blockly and the 3D view do not overflow on phone.

### Accessibility checks

- `axe-core` scan with no critical issues.
- Blockly keyboard navigation works.
- Text mode is fully keyboard accessible.
- `aria-live` announces status changes.
- Reduced motion removes animation but keeps the highlight.
- High-contrast mode works.
- The text transcript matches the run.

### Performance budget

- 60 fps on a mid-range laptop; ≥ 30 fps on a school tablet.
- No per-frame AST evaluation.
- Precompute the action list before playback.
- Cap the grid at 6×6 and the robot at one mesh.
- Pause rendering when the tab is hidden.
- Initial load < 3 s on simulated 4G (Blockly is large).

---

## 10. Acceptance criteria / Go-No-Go

- [ ] Every block compiles to the correct AST.
- [ ] The interpreter always terminates.
- [ ] Move, turn, repeat, and conditions behave correctly.
- [ ] Collisions and out-of-bounds moves produce clear errors.
- [ ] The robot animation matches the action list.
- [ ] Step mode highlights the correct block.
- [ ] Ten challenges are solvable and scored.
- [ ] Text mode solves the same challenges.
- [ ] Teacher reset works.
- [ ] Keyboard-only completion works.
- [ ] Reduced motion and high contrast work.
- [ ] The app works offline after the first load.
- [ ] No `eval`, no generated JavaScript execution.
- [ ] No runtime network calls to an AI service or backend.

If the interpreter can hang or the actions do not match the animation, stop and fix the execution model before adding content.

---

## 11. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Infinite loops freeze the tab | Unusable app | Action, evaluation, loop, and nesting limits; test pathological programs |
| Blockly bundle is large | Slow first load | Code-split Blockly; accept a higher budget; cache offline |
| Blockly is hard to use on phone | Mobile unusable | Tabs, fixed toolbox, text mode alternative |
| AST and animation drift apart | Confusing debugging | Precompute actions; animate from the same queue; test action logs |
| Conditionals confuse beginners | Poor learning | One condition per challenge; show the branch result in the status bar |
| Scope creep into functions/variables | Delays MVP | Restricted language; defer functions and variables |
| 3D camera complexity | Bugs and motion sickness | Fixed isometric camera in the MVP; reduced motion |
| Too many blocks in the toolbox | Cognitive overload | Unlock blocks per challenge; show only allowed blocks |

---

## 12. AI build guide

Use the AI coding agent for scaffolding, the interpreter, Blockly integration, 3D rendering, tests, and screenshot-driven fixes. The interpreter is the highest-risk area; test it before building the UI.

### Recommended build order

1. Scaffold Vite + TypeScript with tests.
2. Implement the grid, robot rules, and unit tests.
3. Implement the AST and interpreter with limits and tests.
4. Integrate Blockly and the JSON → AST converter.
5. Build the 3D world and animation from the action queue.
6. Add controls, status, and star rating.
7. Add challenges and teacher mode.
8. Add text mode.
9. Do responsive/accessibility passes.
10. Use screenshots at three viewports and fix visual regressions.

### Prompt rules

- State the constraint: “No backend, no runtime AI, no network calls, no eval.”
- Require tests for every block and every limit.
- Require a pathological-program test suite (infinite loop, deep nesting, huge repeat).
- Keep the interpreter independent of Blockly and Three.js.
- Precompute actions before animating; never evaluate the AST in the render loop.
- Provide screenshots when fixing Blockly layout or 3D camera issues.

### What not to delegate

- The decision that the interpreter semantics are correct.
- The step and loop limits.
- The accessibility of text mode.
- Classroom pilot feedback.
- Any claim that a child's program is “safe” without running the limits.

### Definition of done

- All interpreter, interaction, and visual tests pass.
- The acceptance checklist is complete.
- A teacher can run the ten challenges without developer help.
- No program can freeze the tab.

---

## 13. Future extensions

- Functions and variables.
- While loops.
- Multiple robots.
- Collectibles, keys, and doors.
- Level editor.
- Program sharing via URL.
- Optional export to a real text-based language.
- Classroom worksheet generator.
- Localization.

---

## 14. References

- Blockly documentation: https://developers.google.com/blockly
- Three.js documentation: https://threejs.org/docs/
- MDN Web APIs: https://developer.mozilla.org/en-US/docs/Web/API
- WCAG 2.2 quick reference: https://www.w3.org/WAI/WCAG22/quickref/
- Standard introductory computer-science references for sequencing, loops, and conditionals.

---

**Plan version:** 1.0
**Created:** 2026-10-27
**Next step:** scaffold the project, then implement M1 (world rules + tests) and M2 (interpreter + limits) before integrating Blockly.
