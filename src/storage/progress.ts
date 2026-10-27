export interface Preferences {
  reducedMotion: boolean;
  highContrast: boolean;
  showCoordinates: boolean;
  highlightBlocks: boolean;
}

export interface ProgressData {
  completed: Record<string, number>;
  lastChallengeId: string;
  workspaces: Record<string, object>;
  textPrograms: Record<string, string>;
  preferences: Preferences;
}

export const STORAGE_KEY = 'blockbot.progress.v1';

const DEFAULT_PROGRESS: ProgressData = {
  completed: {},
  lastChallengeId: 'first-steps',
  workspaces: {},
  textPrograms: {},
  preferences: {
    reducedMotion: false,
    highContrast: false,
    showCoordinates: true,
    highlightBlocks: true
  }
};

function cloneDefault(): ProgressData {
  return JSON.parse(JSON.stringify(DEFAULT_PROGRESS)) as ProgressData;
}

export function loadProgress(): ProgressData {
  if (typeof localStorage === 'undefined') return cloneDefault();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefault();
    const parsed = JSON.parse(raw) as Partial<ProgressData>;
    return {
      completed: isStarMap(parsed.completed) ? parsed.completed : {},
      lastChallengeId:
        typeof parsed.lastChallengeId === 'string'
          ? parsed.lastChallengeId
          : DEFAULT_PROGRESS.lastChallengeId,
      workspaces: isRecord(parsed.workspaces) ? (parsed.workspaces as Record<string, object>) : {},
      textPrograms: isRecord(parsed.textPrograms)
        ? (parsed.textPrograms as Record<string, string>)
        : {},
      preferences: {
        ...DEFAULT_PROGRESS.preferences,
        ...(isRecord(parsed.preferences) ? parsed.preferences : {})
      }
    };
  } catch {
    return cloneDefault();
  }
}

export function saveProgress(progress: ProgressData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    return;
  }
}

export function resetProgress(progress: ProgressData): ProgressData {
  const cleared: ProgressData = {
    ...cloneDefault(),
    lastChallengeId: 'first-steps',
    preferences: { ...progress.preferences }
  };
  saveProgress(cleared);
  return cleared;
}

export function recordCompletion(
  progress: ProgressData,
  challengeId: string,
  stars: number
): ProgressData {
  const previous = progress.completed[challengeId] ?? 0;
  const next: ProgressData = {
    ...progress,
    completed: {
      ...progress.completed,
      [challengeId]: Math.max(previous, stars)
    }
  };
  saveProgress(next);
  return next;
}

export function saveWorkspace(
  progress: ProgressData,
  challengeId: string,
  workspaceJson: object
): ProgressData {
  const next: ProgressData = {
    ...progress,
    workspaces: { ...progress.workspaces, [challengeId]: workspaceJson }
  };
  saveProgress(next);
  return next;
}

export function saveTextProgram(
  progress: ProgressData,
  challengeId: string,
  text: string
): ProgressData {
  const next: ProgressData = {
    ...progress,
    textPrograms: { ...progress.textPrograms, [challengeId]: text }
  };
  saveProgress(next);
  return next;
}

export function savePreferences(
  progress: ProgressData,
  preferences: Partial<Preferences>
): ProgressData {
  const next: ProgressData = {
    ...progress,
    preferences: { ...progress.preferences, ...preferences }
  };
  saveProgress(next);
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStarMap(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) return false;
  return Object.values(value).every(
    (stars) => typeof stars === 'number' && stars >= 1 && stars <= 3
  );
}
