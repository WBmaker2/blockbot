import type { Action } from '../lang/actions';
import { describeAction, toTranscript } from '../lang/actions';
import type { Challenge, Program, RobotState } from '../lang/ast';
import { countBlocks, validateProgram } from '../lang/ast';
import { fromBlocklyWorkspace, ProgramBuildError } from '../lang/fromBlockly';
import { executeProgram, type ExecutionResult } from '../lang/interpreter';
import { MAX_NESTING_DEPTH } from '../lang/limits';
import { parseTextProgram, TextSyntaxError, formatProgram } from '../lang/textMode';
import { BlockEditor } from '../blocks/workspace';
import { SceneManager } from '../render/SceneManager';
import { CHALLENGES, getChallenge, getChallengeIndex } from '../features/challenges';
import { renderChallengeList } from '../features/challenges/ChallengePanel';
import { starsForBlockCount, starsLabel } from '../features/challenges/scoring';
import { buildWorksheet, renderTeacherPanel } from '../features/teacher';
import {
  STORAGE_KEY,
  loadProgress,
  recordCompletion,
  resetProgress,
  savePreferences,
  saveProgress,
  saveTextProgram,
  saveWorkspace,
  type Preferences,
  type ProgressData
} from '../storage/progress';
import { clearBlockHighlight, highlightBlock } from '../ui/BlockHighlight';
import { createLayout, type LayoutRefs } from '../ui/Layout';
import { renderSettings } from '../ui/Settings';
import { StatusBar, type UiStatus } from '../ui/StatusBar';
import { cloneRobot } from '../world/robot';
import { createElement } from '../ui/dom';

type Mode = 'blocks' | 'text';
type Speed = 'slow' | 'normal' | 'fast';

const SPEEDS: Record<Speed, { duration: number; gap: number }> = {
  slow: { duration: 420, gap: 170 },
  normal: { duration: 240, gap: 90 },
  fast: { duration: 120, gap: 35 }
};

type CompileResult =
  { ok: true; program: Program } | { ok: false; message: string; blockId?: string };

interface BlockbotTestApi {
  loadChallenge: (id: string) => void;
  setMode: (mode: Mode) => void;
  loadText: (text: string) => void;
  run: () => void;
  step: () => void;
  reset: () => void;
  getState: () => {
    challengeId: string;
    mode: Mode;
    status: UiStatus;
    robot: RobotState;
    actions: string[];
    index: number;
    stars: number;
  };
}

declare global {
  interface Window {
    blockbot?: BlockbotTestApi;
  }
}

export class App {
  private readonly refs: LayoutRefs;
  private readonly scene: SceneManager;
  private readonly statusBar: StatusBar;
  private progress: ProgressData;
  private challenge: Challenge;
  private robot: RobotState;
  private blockEditor: BlockEditor | null = null;
  private mode: Mode = 'blocks';
  private textSeeded = false;
  private status: UiStatus = 'idle';
  private actions: Action[] = [];
  private actionIndex = 0;
  private result: ExecutionResult | null = null;
  private generation = 0;
  private driveActive = false;
  private driveGeneration = -1;
  private stepCredits = 0;
  private finishHandled = true;
  private runBlockCount = 0;
  private failedChallenges = new Set<string>();
  private hintRevealed = false;
  private workspaceTimer: number | null = null;
  private textTimer: number | null = null;
  private highlightTimer: number | null = null;
  private teacherSelectedId: string;
  private speed: Speed = 'normal';

  constructor(root: HTMLElement) {
    const hadStoredProgress = hasStoredProgress();
    this.progress = loadProgress();
    if (!hadStoredProgress && prefersReducedMotion()) {
      this.progress = savePreferences(this.progress, { reducedMotion: true });
    }

    this.refs = createLayout(root);
    this.statusBar = new StatusBar(this.refs);
    this.challenge = getChallenge(this.progress.lastChallengeId);
    this.teacherSelectedId = this.challenge.id;
    this.robot = cloneRobot(this.challenge.robot);

    this.scene = new SceneManager(this.refs.stageHost);
    this.applyPreferences();
    this.bindEvents();
    this.loadChallenge(this.challenge.id);
    this.exposeTestApi();

    window.requestAnimationFrame(() => {
      document.body.dataset.ready = 'true';
    });
  }

  private bindEvents(): void {
    for (const button of this.refs.modeButtons) {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode as Mode | undefined;
        if (mode) this.setMode(mode);
      });
      button.addEventListener('keydown', (event) => {
        this.handleTabListKey(event, this.refs.modeButtons, (next) => {
          const mode = next.dataset.mode as Mode | undefined;
          if (mode) this.setMode(mode);
        });
      });
    }

    for (const button of this.refs.mobilePanelButtons) {
      button.addEventListener('click', () => {
        const panel = button.dataset.mobilePanel;
        if (panel === 'editor' || panel === 'world') this.setMobilePanel(panel);
      });
      button.addEventListener('keydown', (event) => {
        this.handleTabListKey(event, this.refs.mobilePanelButtons, (next) => {
          const panel = next.dataset.mobilePanel;
          if (panel === 'editor' || panel === 'world') this.setMobilePanel(panel);
        });
      });
    }

    this.refs.runButton.addEventListener('click', () => this.run());
    this.refs.pauseButton.addEventListener('click', () => this.pause());
    this.refs.stepButton.addEventListener('click', () => this.step());
    this.refs.resetButton.addEventListener('click', () => this.reset());
    this.refs.speedSelect.addEventListener('change', () => {
      this.speed = (this.refs.speedSelect.value as Speed) || 'normal';
    });

    this.refs.hintButton.addEventListener('click', () => this.toggleHint());
    this.refs.successNext.addEventListener('click', () => this.goToNextChallenge());
    this.refs.successRetry.addEventListener('click', () => {
      this.reset();
      this.setMobilePanel('editor');
      this.refs.runButton.focus();
    });

    this.refs.openChallenges.addEventListener('click', () => this.openChallenges());
    this.refs.challengePill.addEventListener('click', () => this.openChallenges());
    this.refs.openTeacher.addEventListener('click', () => this.openTeacher());
    this.refs.openSettings.addEventListener('click', () => this.openSettings());
    this.refs.challengesClose.addEventListener('click', () => this.refs.challengesDialog.close());
    this.refs.teacherClose.addEventListener('click', () => this.refs.teacherDialog.close());
    this.refs.settingsClose.addEventListener('click', () => this.refs.settingsDialog.close());

    for (const dialog of [
      this.refs.challengesDialog,
      this.refs.teacherDialog,
      this.refs.settingsDialog
    ]) {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    }

    this.refs.root
      .querySelector<HTMLElement>('[data-action="home"]')
      ?.addEventListener('click', () => {
        this.openChallenges();
      });

    this.refs.codeInput.addEventListener('input', () => this.handleCodeInput());
    this.refs.codeInput.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        this.run();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        const input = this.refs.codeInput;
        const start = input.selectionStart;
        const end = input.selectionEnd;
        input.value = `${input.value.slice(0, start)}  ${input.value.slice(end)}`;
        input.selectionStart = start + 2;
        input.selectionEnd = start + 2;
        this.handleCodeInput();
      }
    });

    window.addEventListener('afterprint', () => {
      this.refs.worksheetPrint.innerHTML = '';
    });
  }

  private loadChallenge(id: string): void {
    this.saveCurrentWorkspaceNow();
    this.saveTextNow();
    this.stopExecution();
    this.disposeBlockEditor();

    this.challenge = getChallenge(id);
    this.teacherSelectedId = this.challenge.id;
    this.robot = cloneRobot(this.challenge.robot);
    this.progress = { ...this.progress, lastChallengeId: this.challenge.id };
    saveProgress(this.progress);

    this.refs.challengeNumber.textContent = String(
      getChallengeIndex(this.challenge.id) + 1
    ).padStart(2, '0');
    this.refs.challengeTitle.textContent = this.challenge.titleKo;
    this.refs.challengeSubtitle.textContent = this.challenge.subtitleKo ?? '';
    this.refs.hudSize.textContent = `${this.challenge.grid.width} × ${this.challenge.grid.depth}`;
    this.refs.hintText.textContent = this.challenge.hintKo;
    this.refs.hintText.hidden = true;
    this.hintRevealed = false;
    this.refs.hintButton.textContent = '힌트 보기';
    this.refs.hintButton.disabled = !this.failedChallenges.has(this.challenge.id);
    this.refs.worldMessage.hidden = true;
    this.refs.successCard.hidden = true;
    this.refs.textError.textContent = '';

    document.title = `${this.challenge.titleKo} — BlockBot`;
    this.scene.setChallenge(this.challenge);
    this.scene.setReducedMotion(this.effectiveReducedMotion());
    this.scene.setCoordinatesVisible(this.progress.preferences.showCoordinates);
    this.scene.setPose(this.robot);

    this.statusBar.reset(this.robot);
    this.refs.transcript.textContent = toTranscript([]);
    const savedText = this.progress.textPrograms[this.challenge.id];
    this.refs.codeInput.value = savedText ?? '';
    this.textSeeded = savedText !== undefined;
    this.seedTextIfNeeded();
    this.applyModeUi();
    this.refreshCount();
    this.updateProgressUi();
    this.updateControls();
    this.setMobilePanel('editor');
  }

  private seedTextIfNeeded(): void {
    if (this.textSeeded || this.mode !== 'text') return;
    if (this.blockEditor) {
      const compiled = this.tryCompileBlocks();
      if (compiled.ok && compiled.program.length > 0) {
        this.refs.codeInput.value = formatProgram(compiled.program);
      }
    } else {
      const saved = this.progress.workspaces[this.challenge.id];
      if (saved) {
        try {
          const program = fromBlocklyWorkspace(saved);
          if (program.length > 0) this.refs.codeInput.value = formatProgram(program);
        } catch {
          this.refs.codeInput.value = '';
        }
      }
    }
    this.textSeeded = true;
  }

  private setMode(mode: Mode): void {
    if (mode === this.mode) {
      this.applyModeUi();
      return;
    }
    if (this.mode === 'blocks') this.saveCurrentWorkspaceNow();
    this.seedTextIfNeeded();
    this.mode = mode;
    if (mode === 'text') this.seedTextIfNeeded();
    this.applyModeUi();
    this.refreshCount();
  }

  private applyModeUi(): void {
    const blocks = this.mode === 'blocks';
    this.refs.blocklyHost.hidden = !blocks;
    this.refs.textEditor.hidden = blocks;
    for (const button of this.refs.modeButtons) {
      const selected = button.dataset.mode === this.mode;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    if (blocks) {
      this.ensureBlockEditor();
      window.setTimeout(() => this.blockEditor?.resize(), 30);
    }
  }

  private ensureBlockEditor(): void {
    if (this.blockEditor) return;
    this.refs.blocklyHost.hidden = false;
    try {
      this.blockEditor = new BlockEditor(this.refs.blocklyHost, this.challenge, {
        initialWorkspace: this.progress.workspaces[this.challenge.id] ?? null,
        onChange: () => this.handleBlockChange()
      });
    } catch {
      this.showToast('블록 편집기를 불러오지 못했어요. 새로고침해 주세요.');
    }
  }

  private disposeBlockEditor(): void {
    this.blockEditor?.dispose();
    this.blockEditor = null;
    this.refs.blocklyHost.replaceChildren();
  }

  private handleBlockChange(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.resetExecution();
    }
    const compiled = this.tryCompileBlocks();
    this.updateBlockCount(compiled);
    this.debounceWorkspaceSave();
  }

  private handleCodeInput(): void {
    if (this.status === 'running' || this.status === 'paused') {
      this.resetExecution();
    }
    const compiled = this.tryCompileText();
    if (compiled.ok) {
      this.refs.textError.textContent = '';
    } else if (this.refs.codeInput.value.trim() !== '') {
      this.refs.textError.textContent = compiled.message;
    } else {
      this.refs.textError.textContent = '';
    }
    this.updateBlockCount(compiled);
    this.debounceTextSave();
  }

  private tryCompileBlocks(): CompileResult {
    if (!this.blockEditor) return { ok: false, message: '블록 편집기를 준비하고 있어요.' };
    try {
      const program = fromBlocklyWorkspace(this.blockEditor.serialize());
      const validation = validateProgram(program, 1, MAX_NESTING_DEPTH);
      if (!validation.ok) return { ok: false, message: validation.message };
      return { ok: true, program };
    } catch (error) {
      if (error instanceof ProgramBuildError) {
        return { ok: false, message: error.message, blockId: error.blockId };
      }
      return { ok: false, message: '블록을 프로그램으로 바꾸지 못했어요.' };
    }
  }

  private tryCompileText(): CompileResult {
    try {
      return { ok: true, program: parseTextProgram(this.refs.codeInput.value) };
    } catch (error) {
      if (error instanceof TextSyntaxError) {
        return { ok: false, message: error.message };
      }
      return { ok: false, message: '텍스트 코드를 읽지 못했어요.' };
    }
  }

  private compileCurrent(): CompileResult {
    return this.mode === 'blocks' ? this.tryCompileBlocks() : this.tryCompileText();
  }

  private updateBlockCount(compiled: CompileResult): void {
    if (!compiled.ok) {
      this.refs.blockCount.textContent = `블록 확인 필요 · 기준 ${this.challenge.parBlocks}`;
      this.refs.blockCount.classList.remove('is-par');
      return;
    }
    const count = countBlocks(compiled.program);
    this.refs.blockCount.textContent = `블록 ${count} · 기준 ${this.challenge.parBlocks}`;
    this.refs.blockCount.classList.toggle('is-par', count > 0 && count <= this.challenge.parBlocks);
  }

  private refreshCount(): void {
    if (this.mode === 'text') {
      const compiled = this.tryCompileText();
      if (!compiled.ok && this.refs.codeInput.value.trim() !== '') {
        this.refs.textError.textContent = compiled.message;
      }
      this.updateBlockCount(compiled);
    } else {
      this.updateBlockCount(this.tryCompileBlocks());
    }
  }

  private run(): void {
    if (this.status === 'running') return;

    if (this.status === 'paused' && this.result) {
      this.status = 'running';
      this.hideWorldMessage();
      this.updateControls();
      this.statusBar.updateResult('running');
      if (this.isMobile()) this.setMobilePanel('world');
      this.startDrive();
      return;
    }

    if (!this.prepareSession('running')) return;
    if (this.isMobile()) this.setMobilePanel('world');
    this.startDrive();
  }

  private prepareSession(initialStatus: 'running' | 'paused'): boolean {
    const compiled = this.compileCurrent();
    if (!compiled.ok) {
      this.stopExecution();
      this.robot = cloneRobot(this.challenge.robot);
      this.scene.setPose(this.robot);
      this.statusBar.reset(this.robot);
      this.status = 'error';
      this.result = null;
      this.finishHandled = true;
      this.statusBar.updateResult('error', compiled.message);
      this.statusBar.updateAction('프로그램을 준비하지 못했어요');
      this.showWorldMessage('error', compiled.message);
      this.refs.successCard.hidden = true;
      clearBlockHighlight(this.blockEditor);
      this.enableHint();
      this.updateControls();
      return false;
    }

    this.stopExecution();
    const result = executeProgram(compiled.program, this.challenge);
    this.generation += 1;
    this.actions = result.actions;
    this.actionIndex = 0;
    this.result = result;
    this.status = initialStatus;
    this.finishHandled = false;
    this.stepCredits = 0;
    this.runBlockCount = countBlocks(compiled.program);
    this.robot = cloneRobot(this.challenge.robot);
    this.scene.setPose(this.robot);
    this.statusBar.reset(this.robot);
    this.statusBar.updateResult(initialStatus);
    this.statusBar.updateTranscript(this.actions, 0);
    this.refs.successCard.hidden = true;
    this.hideWorldMessage();
    clearBlockHighlight(this.blockEditor);
    this.updateControls();
    return true;
  }

  private pause(): void {
    if (this.status !== 'running') return;
    this.status = 'paused';
    this.statusBar.updateResult('paused');
    this.updateControls();
  }

  private step(): void {
    if (this.status === 'running') {
      this.status = 'paused';
      this.statusBar.updateResult('paused');
    }

    if (
      this.status === 'idle' ||
      this.status === 'success' ||
      this.status === 'error' ||
      this.status === 'incomplete' ||
      !this.result
    ) {
      if (!this.prepareSession('paused')) return;
    }

    this.status = 'paused';
    this.statusBar.updateResult('paused');
    this.stepCredits = Math.min(1, this.stepCredits + 1);
    this.updateControls();
    if (this.isMobile()) this.setMobilePanel('world');
    this.startDrive();
  }

  private startDrive(): void {
    const generation = this.generation;
    if (this.driveActive && this.driveGeneration === generation) return;
    this.driveActive = true;
    this.driveGeneration = generation;
    void this.drive(generation)
      .catch(() => {
        if (generation !== this.generation) return;
        this.status = 'error';
        this.showWorldMessage('error', '실행 중에 문제가 생겼어요. 초기화 후 다시 시도해 주세요.');
        this.statusBar.updateResult('error');
        this.updateControls();
      })
      .finally(() => {
        if (this.driveGeneration === generation) this.driveActive = false;
        if (generation === this.generation && (this.status === 'running' || this.stepCredits > 0)) {
          this.startDrive();
        }
      });
  }

  private async drive(generation: number): Promise<void> {
    while (generation === this.generation) {
      if (this.status === 'running') {
        if (this.actionIndex >= this.actions.length) break;
        const action = this.actions[this.actionIndex];
        this.actionIndex += 1;
        if (!action) break;
        await this.executeAction(action, generation);
        if (generation !== this.generation) return;
        if (this.status === 'running') {
          await this.delay(this.speedConfig().gap);
          if (generation !== this.generation) return;
        }
        continue;
      }

      if (this.stepCredits > 0) {
        this.stepCredits -= 1;
        if (this.actionIndex >= this.actions.length) break;
        const action = this.actions[this.actionIndex];
        this.actionIndex += 1;
        if (!action) break;
        await this.executeAction(action, generation);
        if (generation !== this.generation) return;
        continue;
      }

      break;
    }

    if (generation !== this.generation) return;
    this.maybeFinishExecution();
  }

  private async executeAction(action: Action, generation: number): Promise<void> {
    const reduce = this.effectiveReducedMotion();
    const config = this.speedConfig();
    const duration = reduce ? 0 : config.duration;

    highlightBlock(
      this.blockEditor,
      action.blockId ?? null,
      this.mode === 'blocks' && this.progress.preferences.highlightBlocks
    );
    this.statusBar.updateAction(describeAction(action));

    switch (action.type) {
      case 'move': {
        if (action.blocked || !action.to) {
          await this.delay(reduce ? 0 : 60);
          if (generation !== this.generation) return;
          break;
        }
        await this.scene.animateMove(
          { ...action.from, dir: action.dir },
          { ...action.to, dir: action.dir },
          duration
        );
        if (generation !== this.generation) return;
        this.robot = { x: action.to.x, z: action.to.z, dir: action.dir };
        break;
      }
      case 'turn': {
        await this.scene.animateTurn(
          { ...this.robot },
          { ...this.robot, dir: action.to },
          reduce ? 0 : duration * 0.75
        );
        if (generation !== this.generation) return;
        this.robot = { ...this.robot, dir: action.to };
        break;
      }
      case 'check': {
        await this.delay(reduce ? 0 : Math.min(170, duration * 0.7));
        if (generation !== this.generation) return;
        break;
      }
      case 'error': {
        this.status = 'error';
        break;
      }
    }

    this.statusBar.updateRobot(this.robot);
    this.statusBar.updateTranscript(this.actions, this.actionIndex);
  }

  private maybeFinishExecution(): void {
    if (this.finishHandled || !this.result) return;
    if (this.status === 'error') {
      this.finishHandled = true;
      this.finishWithError(this.result.error ?? '프로그램이 멈췄어요.');
      return;
    }
    if (this.actionIndex < this.actions.length) return;

    this.finishHandled = true;
    if (this.result.status === 'success') {
      this.finishWithSuccess();
    } else if (this.result.status === 'error') {
      this.finishWithError(this.result.error ?? '프로그램이 멈췄어요.');
    } else {
      this.finishIncomplete();
    }
  }

  private finishWithSuccess(): void {
    const stars = starsForBlockCount(this.runBlockCount, this.challenge.parBlocks);
    this.status = 'success';
    this.progress = recordCompletion(this.progress, this.challenge.id, stars);
    this.refs.successStars.textContent = starsLabel(stars);
    this.refs.successStars.setAttribute('aria-label', `별 ${stars}개`);
    this.refs.successTitle.textContent = `${this.challenge.titleKo} 성공!`;
    this.refs.successCopy.textContent = this.challenge.explanationKo;
    this.refs.successBlocks.textContent = `사용한 블록 ${this.runBlockCount}개 · 기준 ${this.challenge.parBlocks}개`;
    const isLast = getChallengeIndex(this.challenge.id) >= CHALLENGES.length - 1;
    this.refs.successNext.textContent = isLast ? '도전 목록' : '다음 도전';
    this.refs.successCard.hidden = false;
    this.statusBar.updateResult('success', this.challenge.explanationKo);
    this.statusBar.updateAction('목표에 도착했어요!');
    this.updateProgressUi();
    this.updateControls();
    this.refreshChallengeListIfOpen();
    this.scheduleHighlightClear();
    window.setTimeout(() => this.refs.successCard.focus(), 80);
  }

  private finishWithError(message: string): void {
    this.status = 'error';
    this.statusBar.updateResult('error', message);
    this.showWorldMessage('error', message);
    this.enableHint();
    this.updateControls();
    this.scheduleHighlightClear();
  }

  private finishIncomplete(): void {
    this.status = 'incomplete';
    const message = '목표에 도착하지 못했어요. 로봇의 위치와 방향을 확인해 보세요.';
    this.statusBar.updateResult('incomplete', message);
    this.showWorldMessage('incomplete', message);
    this.enableHint();
    this.updateControls();
    this.scheduleHighlightClear();
  }

  private reset(): void {
    this.resetExecution();
    this.refs.successCard.hidden = true;
    this.hideWorldMessage();
    this.setMobilePanel(this.mode === 'blocks' ? 'editor' : 'world');
  }

  private resetExecution(): void {
    this.stopExecution();
    this.robot = cloneRobot(this.challenge.robot);
    this.scene.setPose(this.robot);
    this.statusBar.reset(this.robot);
    this.refs.successCard.hidden = true;
    this.hideWorldMessage();
    clearBlockHighlight(this.blockEditor);
    this.updateControls();
  }

  private stopExecution(): void {
    this.generation += 1;
    this.status = 'idle';
    this.actions = [];
    this.actionIndex = 0;
    this.result = null;
    this.stepCredits = 0;
    this.finishHandled = true;
    if (this.highlightTimer !== null) {
      window.clearTimeout(this.highlightTimer);
      this.highlightTimer = null;
    }
  }

  private speedConfig(): { duration: number; gap: number } {
    const config = SPEEDS[this.speed] ?? SPEEDS.normal;
    if (this.effectiveReducedMotion()) return { duration: 0, gap: 30 };
    return config;
  }

  private delay(ms: number): Promise<void> {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  private scheduleHighlightClear(): void {
    if (this.highlightTimer !== null) window.clearTimeout(this.highlightTimer);
    const generation = this.generation;
    this.highlightTimer = window.setTimeout(() => {
      if (generation === this.generation) clearBlockHighlight(this.blockEditor);
      this.highlightTimer = null;
    }, 900);
  }

  private updateControls(): void {
    const running = this.status === 'running';
    const paused = this.status === 'paused';
    this.refs.pauseButton.disabled = !running;
    this.refs.runButton.disabled = running;
    this.refs.runButton.classList.toggle('btn-pulse', !running);
    this.refs.runButton.innerHTML = paused
      ? '<span aria-hidden="true">▶</span> 계속'
      : this.status === 'success' || this.status === 'error' || this.status === 'incomplete'
        ? '<span aria-hidden="true">↻</span> 다시 실행'
        : '<span aria-hidden="true">▶</span> 실행';
    this.refs.statusResult.dataset.state = this.status;
  }

  private setMobilePanel(panel: 'editor' | 'world'): void {
    this.refs.editorPanel.classList.toggle('is-mobile-hidden', panel !== 'editor');
    this.refs.worldPanel.classList.toggle('is-mobile-hidden', panel !== 'world');
    for (const button of this.refs.mobilePanelButtons) {
      const selected = button.dataset.mobilePanel === panel;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-selected', String(selected));
    }
    if (panel === 'world') {
      window.setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
    } else {
      window.setTimeout(() => this.blockEditor?.resize(), 30);
    }
  }

  private isMobile(): boolean {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  private handleTabListKey(
    event: KeyboardEvent,
    buttons: HTMLButtonElement[],
    activate: (button: HTMLButtonElement) => void
  ): void {
    if (buttons.length === 0) return;
    const currentIndex = buttons.indexOf(event.currentTarget as HTMLButtonElement);
    let nextIndex = -1;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
    else if (event.key === 'ArrowLeft')
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = buttons.length - 1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const next = buttons[nextIndex];
    if (!next) return;
    next.focus();
    activate(next);
  }

  private toggleHint(): void {
    if (this.refs.hintButton.disabled) return;
    this.hintRevealed = !this.hintRevealed;
    this.refs.hintText.hidden = !this.hintRevealed;
    this.refs.hintButton.textContent = this.hintRevealed ? '힌트 닫기' : '힌트 보기';
  }

  private enableHint(): void {
    const firstFailure = !this.failedChallenges.has(this.challenge.id);
    this.failedChallenges.add(this.challenge.id);
    this.refs.hintButton.disabled = false;
    this.refs.hintButton.title = '';
    if (firstFailure && !this.hintRevealed) this.showToast('힌트를 볼 수 있어요.');
  }

  private showWorldMessage(kind: 'error' | 'incomplete', message: string): void {
    this.refs.worldMessage.hidden = false;
    this.refs.worldMessage.className = `world-message world-message--${kind}`;
    this.refs.worldMessage.textContent = message;
  }

  private hideWorldMessage(): void {
    this.refs.worldMessage.hidden = true;
    this.refs.worldMessage.textContent = '';
  }

  private goToNextChallenge(): void {
    const index = getChallengeIndex(this.challenge.id);
    const next = CHALLENGES[index + 1];
    if (next) {
      this.loadChallenge(next.id);
      this.setMobilePanel('editor');
    } else {
      this.openChallenges();
    }
  }

  private openChallenges(): void {
    this.refreshChallengeList();
    if (!this.refs.challengesDialog.open) this.refs.challengesDialog.showModal();
  }

  private refreshChallengeList(): void {
    renderChallengeList(
      this.refs.challengeList,
      CHALLENGES,
      this.progress.completed,
      this.challenge.id,
      (id) => {
        this.refs.challengesDialog.close();
        this.loadChallenge(id);
      }
    );
  }

  private refreshChallengeListIfOpen(): void {
    if (this.refs.challengesDialog.open) this.refreshChallengeList();
  }

  private openTeacher(): void {
    this.teacherSelectedId = this.challenge.id;
    this.renderTeacher();
    if (!this.refs.teacherDialog.open) this.refs.teacherDialog.showModal();
  }

  private renderTeacher(): void {
    renderTeacherPanel({
      container: this.refs.teacherContent,
      challenges: CHALLENGES,
      selectedId: this.teacherSelectedId,
      progress: this.progress,
      onSelect: (id) => {
        this.teacherSelectedId = id;
        this.renderTeacher();
      },
      onOpen: (id) => {
        this.refs.teacherDialog.close();
        this.loadChallenge(id);
      },
      onReset: () => this.handleTeacherReset(),
      onPrint: (id) => this.printWorksheet(id),
      onPreferences: (preferences) => this.updatePreferences(preferences)
    });
  }

  private handleTeacherReset(): void {
    const confirmed = window.confirm(
      '모든 도전의 별과 저장된 블록을 지울까요? 이 작업은 되돌릴 수 없어요.'
    );
    if (!confirmed) return;
    this.progress = resetProgress(this.progress);
    this.progress = { ...this.progress, lastChallengeId: this.challenge.id };
    saveProgress(this.progress);
    this.failedChallenges.clear();
    this.hintRevealed = false;
    this.refs.hintText.hidden = true;
    this.refs.hintButton.textContent = '힌트 보기';
    this.refs.hintButton.disabled = true;
    this.updateProgressUi();
    this.refreshChallengeListIfOpen();
    this.renderTeacher();
    this.showToast('진행 기록을 초기화했어요.');
  }

  private printWorksheet(id: string): void {
    if (this.refs.teacherDialog.open) this.refs.teacherDialog.close();
    if (this.refs.settingsDialog.open) this.refs.settingsDialog.close();
    this.refs.worksheetPrint.innerHTML = buildWorksheet(getChallenge(id));
    window.print();
  }

  private openSettings(): void {
    this.renderSettingsDialog();
    if (!this.refs.settingsDialog.open) this.refs.settingsDialog.showModal();
  }

  private renderSettingsDialog(): void {
    renderSettings(this.refs.settingsContent, this.progress.preferences, (partial) => {
      this.updatePreferences(partial);
    });
  }

  private updatePreferences(partial: Partial<Preferences>): void {
    this.progress = savePreferences(this.progress, partial);
    this.applyPreferences();
  }

  private applyPreferences(): void {
    const reduce = this.effectiveReducedMotion();
    document.documentElement.classList.toggle('reduced-motion', reduce);
    document.documentElement.dataset.contrast = this.progress.preferences.highContrast
      ? 'high'
      : 'normal';
    this.scene.setReducedMotion(reduce);
    this.scene.setCoordinatesVisible(this.progress.preferences.showCoordinates);
  }

  private effectiveReducedMotion(): boolean {
    return (
      this.progress.preferences.reducedMotion ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private updateProgressUi(): void {
    const completed = Object.keys(this.progress.completed).length;
    this.refs.progressCount.textContent = `${completed} / ${CHALLENGES.length}`;
  }

  private showToast(message: string): void {
    const toast = createElement('div', 'toast');
    toast.textContent = message;
    this.refs.toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 260);
    }, 2600);
  }

  private debounceWorkspaceSave(): void {
    if (this.workspaceTimer !== null) window.clearTimeout(this.workspaceTimer);
    this.workspaceTimer = window.setTimeout(() => {
      this.saveCurrentWorkspaceNow();
      this.workspaceTimer = null;
    }, 600);
  }

  private saveCurrentWorkspaceNow(): void {
    if (this.workspaceTimer !== null) {
      window.clearTimeout(this.workspaceTimer);
      this.workspaceTimer = null;
    }
    if (!this.blockEditor) return;
    try {
      const json = this.blockEditor.serialize();
      this.progress = saveWorkspace(this.progress, this.challenge.id, json);
    } catch {
      return;
    }
  }

  private debounceTextSave(): void {
    if (this.textTimer !== null) window.clearTimeout(this.textTimer);
    this.textTimer = window.setTimeout(() => {
      this.saveTextNow();
      this.textTimer = null;
    }, 400);
  }

  private saveTextNow(): void {
    if (this.textTimer !== null) {
      window.clearTimeout(this.textTimer);
      this.textTimer = null;
    }
    if (!this.textSeeded) return;
    this.progress = saveTextProgram(this.progress, this.challenge.id, this.refs.codeInput.value);
  }

  private exposeTestApi(): void {
    window.blockbot = {
      loadChallenge: (id) => this.loadChallenge(id),
      setMode: (mode) => this.setMode(mode),
      loadText: (text) => {
        this.setMode('text');
        this.refs.codeInput.value = text;
        this.textSeeded = true;
        this.handleCodeInput();
      },
      run: () => this.run(),
      step: () => this.step(),
      reset: () => this.reset(),
      getState: () => ({
        challengeId: this.challenge.id,
        mode: this.mode,
        status: this.status,
        robot: { ...this.robot },
        actions: this.actions.slice(0, this.actionIndex).map(describeAction),
        index: this.actionIndex,
        stars: this.progress.completed[this.challenge.id] ?? 0
      })
    };
  }
}

function hasStoredProgress(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
