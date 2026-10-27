export interface LayoutRefs {
  root: HTMLElement;
  challengeTitle: HTMLElement;
  challengeSubtitle: HTMLElement;
  challengeNumber: HTMLElement;
  progressCount: HTMLElement;
  blocklyHost: HTMLElement;
  textEditor: HTMLElement;
  codeInput: HTMLTextAreaElement;
  textError: HTMLElement;
  blockCount: HTMLElement;
  modeButtons: HTMLButtonElement[];
  mobilePanelButtons: HTMLButtonElement[];
  editorPanel: HTMLElement;
  worldPanel: HTMLElement;
  stageHost: HTMLElement;
  hudSize: HTMLElement;
  hudPosition: HTMLElement;
  hudDirection: HTMLElement;
  worldMessage: HTMLElement;
  hintButton: HTMLButtonElement;
  hintText: HTMLElement;
  runButton: HTMLButtonElement;
  pauseButton: HTMLButtonElement;
  stepButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
  speedSelect: HTMLSelectElement;
  statusPosition: HTMLElement;
  statusDirection: HTMLElement;
  statusAction: HTMLElement;
  statusResult: HTMLElement;
  liveState: HTMLElement;
  transcript: HTMLElement;
  successCard: HTMLElement;
  successStars: HTMLElement;
  successTitle: HTMLElement;
  successCopy: HTMLElement;
  successBlocks: HTMLElement;
  successNext: HTMLButtonElement;
  successRetry: HTMLButtonElement;
  challengesDialog: HTMLDialogElement;
  challengeList: HTMLElement;
  challengesClose: HTMLButtonElement;
  teacherDialog: HTMLDialogElement;
  teacherContent: HTMLElement;
  teacherClose: HTMLButtonElement;
  settingsDialog: HTMLDialogElement;
  settingsContent: HTMLElement;
  settingsClose: HTMLButtonElement;
  openChallenges: HTMLButtonElement;
  openTeacher: HTMLButtonElement;
  openSettings: HTMLButtonElement;
  challengePill: HTMLButtonElement;
  worksheetPrint: HTMLElement;
  toastRegion: HTMLElement;
}

export function createLayout(root: HTMLElement): LayoutRefs {
  root.innerHTML = `
    <a class="skip-link" href="#editor-panel">코딩 화면으로 건너뛰기</a>
    <div class="app-shell">
      <header class="topbar">
        <button class="brand" type="button" data-action="home" aria-label="BlockBot 블록으로 움직이는 로봇 홈">
          <span class="brand__mark" aria-hidden="true">
            <span class="brand__eye"></span>
            <span class="brand__eye"></span>
          </span>
          <span class="brand__text">
            <span class="brand__name">BlockBot</span>
            <span class="brand__tagline">블록으로 움직이는 로봇</span>
          </span>
        </button>

        <div class="topbar__mission">
          <span class="eyebrow">오늘의 도전</span>
          <button class="mission-pill" id="challenge-pill" type="button" aria-haspopup="dialog">
            <span class="mission-pill__num" id="challenge-number">01</span>
            <span class="mission-pill__title" id="challenge-title">첫걸음</span>
            <span class="mission-pill__chevron" aria-hidden="true">▾</span>
          </button>
          <span class="mission-progress" id="progress-count">0 / 10</span>
        </div>

        <nav class="topbar__actions" aria-label="주요 메뉴">
          <button class="btn btn--quiet" id="open-challenges" type="button">도전 목록</button>
          <button class="btn btn--quiet" id="open-teacher" type="button">선생님</button>
          <button class="icon-btn" id="open-settings" type="button" aria-label="설정">
            <span aria-hidden="true">⚙</span>
          </button>
        </nav>
      </header>

      <div class="mobile-panel-tabs" role="tablist" aria-label="화면 선택">
        <button class="mobile-panel-tabs__btn is-active" type="button" data-mobile-panel="editor" role="tab" aria-selected="true">코딩</button>
        <button class="mobile-panel-tabs__btn" type="button" data-mobile-panel="world" role="tab" aria-selected="false">세계</button>
      </div>

      <main class="workspace">
        <section class="panel editor-panel" id="editor-panel" aria-label="블록 코딩">
          <div class="panel__head">
            <div class="mode-tabs" role="tablist" aria-label="코딩 방식">
              <button class="mode-tab is-active" type="button" data-mode="blocks" role="tab" aria-selected="true">블록</button>
              <button class="mode-tab" type="button" data-mode="text" role="tab" aria-selected="false">텍스트</button>
            </div>
            <div class="panel__meta">
              <span class="block-count" id="block-count">블록 0 · 기준 3</span>
            </div>
          </div>
          <div class="editor-body">
            <div class="blockly-host" id="blockly-host"></div>
            <div class="text-editor" id="text-editor" hidden>
              <div class="text-editor__head">
                <span class="text-editor__label">텍스트 코드</span>
                <span class="text-editor__hint">Ctrl/Cmd + Enter로 실행</span>
              </div>
              <textarea id="code-input" class="code-input" spellcheck="false" aria-label="텍스트 코드 입력" aria-describedby="text-help text-error"></textarea>
              <p class="text-help" id="text-help">
                <code>move</code> <code>left</code> <code>right</code>
                <code>repeat 4 { move }</code>
                <code>if wall { right } else { move }</code>
              </p>
              <p class="text-error" id="text-error" role="alert"></p>
            </div>
          </div>
        </section>

        <section class="panel world-panel" id="world-panel" aria-label="로봇 세계">
          <div class="world-stage" id="world-stage">
            <div class="scene-host" id="scene-host"></div>
            <div class="world-hud" aria-hidden="true">
              <span class="hud-chip" id="hud-size">5 × 5</span>
              <span class="hud-chip" id="hud-position">(0, 2)</span>
              <span class="hud-chip" id="hud-direction">동쪽</span>
            </div>
            <div class="world-message" id="world-message" role="status" hidden></div>
            <div class="success-card" id="success-card" role="dialog" aria-modal="false" aria-labelledby="success-title" aria-describedby="success-copy" tabindex="-1" hidden>
              <p class="success-card__eyebrow">도전 성공</p>
              <div class="success-card__stars" id="success-stars" aria-label="별점"></div>
              <h2 class="success-card__title" id="success-title">목표에 도착했어요!</h2>
              <p class="success-card__copy" id="success-copy"></p>
              <p class="success-card__blocks" id="success-blocks"></p>
              <div class="success-card__actions">
                <button class="btn btn--primary btn-pulse" id="success-next" type="button">다음 도전</button>
                <button class="btn btn--ghost" id="success-retry" type="button">다시 하기</button>
              </div>
            </div>
          </div>

          <div class="challenge-brief">
            <div class="challenge-brief__text">
              <h1 id="challenge-subtitle">로봇을 목표까지 곧장 보내요</h1>
              <p>로봇이 목표 칸에 도착하면 성공이에요.</p>
            </div>
            <button class="btn btn--hint" id="hint-button" type="button" disabled>힌트 보기</button>
          </div>
          <p class="hint-text" id="hint-text" role="status" hidden></p>
        </section>
      </main>

      <section class="control-dock" aria-label="실행 컨트롤">
        <div class="status-strip">
          <span class="status-strip__item"><span class="status-strip__label">위치</span><strong id="status-position">(0, 2)</strong></span>
          <span class="status-strip__item"><span class="status-strip__label">방향</span><strong id="status-direction">동쪽</strong></span>
          <span class="status-strip__item status-strip__item--wide"><span class="status-strip__label">최근 동작</span><strong id="status-action">아직 실행하지 않았어요</strong></span>
          <span class="status-strip__item status-strip__item--result" aria-live="polite"><span class="status-strip__label">결과</span><strong id="status-result">준비됨</strong></span>
          <span class="sr-only" id="live-state" aria-live="polite"></span>
          <details class="transcript">
            <summary>실행 기록</summary>
            <p id="transcript">아직 실행한 동작이 없어요.</p>
          </details>
        </div>
        <div class="control-bar">
          <div class="control-bar__group">
            <button class="btn btn--primary btn-pulse" id="run-button" type="button"><span aria-hidden="true">▶</span> 실행</button>
            <button class="btn btn--control" id="pause-button" type="button" disabled><span aria-hidden="true">Ⅱ</span> 일시정지</button>
            <button class="btn btn--control" id="step-button" type="button"><span aria-hidden="true">→|</span> 한 단계</button>
            <button class="btn btn--control" id="reset-button" type="button"><span aria-hidden="true">↺</span> 초기화</button>
          </div>
          <label class="speed-control" for="speed-select">
            <span>속도</span>
            <select id="speed-select">
              <option value="slow">느리게</option>
              <option value="normal" selected>보통</option>
              <option value="fast">빠르게</option>
            </select>
          </label>
        </div>
      </section>
    </div>

    <dialog class="sheet" id="challenges-dialog" aria-labelledby="challenges-heading">
      <div class="sheet__head">
        <div>
          <p class="eyebrow">도전 목록</p>
          <h2 id="challenges-heading">어떤 미션을 풀어 볼까요?</h2>
        </div>
        <button class="icon-btn" id="challenges-close" type="button" aria-label="닫기">✕</button>
      </div>
      <div class="challenge-grid" id="challenge-list"></div>
    </dialog>

    <dialog class="sheet sheet--teacher" id="teacher-dialog" aria-labelledby="teacher-heading">
      <div class="sheet__head">
        <div>
          <p class="eyebrow">교사용</p>
          <h2 id="teacher-heading">선생님 모드</h2>
        </div>
        <button class="icon-btn" id="teacher-close" type="button" aria-label="닫기">✕</button>
      </div>
      <div id="teacher-content"></div>
    </dialog>

    <dialog class="sheet sheet--settings" id="settings-dialog" aria-labelledby="settings-heading">
      <div class="sheet__head">
        <div>
          <p class="eyebrow">접근성</p>
          <h2 id="settings-heading">설정</h2>
        </div>
        <button class="icon-btn" id="settings-close" type="button" aria-label="닫기">✕</button>
      </div>
      <div id="settings-content"></div>
    </dialog>

    <div class="toast-region" id="toast-region" aria-live="polite"></div>
    <div id="worksheet-print" class="worksheet-print"></div>
  `;

  return {
    root,
    challengeTitle: select(root, '#challenge-title'),
    challengeSubtitle: select(root, '#challenge-subtitle'),
    challengeNumber: select(root, '#challenge-number'),
    progressCount: select(root, '#progress-count'),
    blocklyHost: select(root, '#blockly-host'),
    textEditor: select(root, '#text-editor'),
    codeInput: select(root, '#code-input'),
    textError: select(root, '#text-error'),
    blockCount: select(root, '#block-count'),
    modeButtons: Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mode]')),
    mobilePanelButtons: Array.from(root.querySelectorAll<HTMLButtonElement>('[data-mobile-panel]')),
    editorPanel: select(root, '#editor-panel'),
    worldPanel: select(root, '#world-panel'),
    stageHost: select(root, '#world-stage'),
    hudSize: select(root, '#hud-size'),
    hudPosition: select(root, '#hud-position'),
    hudDirection: select(root, '#hud-direction'),
    worldMessage: select(root, '#world-message'),
    hintButton: select(root, '#hint-button'),
    hintText: select(root, '#hint-text'),
    runButton: select(root, '#run-button'),
    pauseButton: select(root, '#pause-button'),
    stepButton: select(root, '#step-button'),
    resetButton: select(root, '#reset-button'),
    speedSelect: select(root, '#speed-select'),
    statusPosition: select(root, '#status-position'),
    statusDirection: select(root, '#status-direction'),
    statusAction: select(root, '#status-action'),
    statusResult: select(root, '#status-result'),
    liveState: select(root, '#live-state'),
    transcript: select(root, '#transcript'),
    successCard: select(root, '#success-card'),
    successStars: select(root, '#success-stars'),
    successTitle: select(root, '#success-title'),
    successCopy: select(root, '#success-copy'),
    successBlocks: select(root, '#success-blocks'),
    successNext: select(root, '#success-next'),
    successRetry: select(root, '#success-retry'),
    challengesDialog: select(root, '#challenges-dialog'),
    challengeList: select(root, '#challenge-list'),
    challengesClose: select(root, '#challenges-close'),
    teacherDialog: select(root, '#teacher-dialog'),
    teacherContent: select(root, '#teacher-content'),
    teacherClose: select(root, '#teacher-close'),
    settingsDialog: select(root, '#settings-dialog'),
    settingsContent: select(root, '#settings-content'),
    settingsClose: select(root, '#settings-close'),
    openChallenges: select(root, '#open-challenges'),
    openTeacher: select(root, '#open-teacher'),
    openSettings: select(root, '#open-settings'),
    challengePill: select(root, '#challenge-pill'),
    worksheetPrint: select(root, '#worksheet-print'),
    toastRegion: select(root, '#toast-region')
  };
}

function select<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
