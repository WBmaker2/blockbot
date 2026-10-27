import type { Action } from '../lang/actions';
import { toTranscript } from '../lang/actions';
import type { Direction, RobotState } from '../lang/ast';
import { DIRECTION_LABELS_KO } from '../world/robot';
import type { LayoutRefs } from './Layout';

export type UiStatus = 'idle' | 'running' | 'paused' | 'success' | 'error' | 'incomplete';

const STATUS_LABELS: Record<UiStatus, string> = {
  idle: '준비됨',
  running: '실행 중',
  paused: '일시정지',
  success: '성공!',
  error: '오류',
  incomplete: '목표 미도착'
};

export class StatusBar {
  private readonly refs: LayoutRefs;

  constructor(refs: LayoutRefs) {
    this.refs = refs;
  }

  updateRobot(robot: RobotState): void {
    const position = `(${robot.x}, ${robot.z})`;
    const direction = DIRECTION_LABELS_KO[robot.dir];
    this.refs.statusPosition.textContent = position;
    this.refs.statusDirection.textContent = direction;
    this.refs.hudPosition.textContent = position;
    this.refs.hudDirection.textContent = direction;
    this.refs.liveState.textContent = `로봇 위치 ${position}, 방향 ${direction}`;
  }

  updateAction(action: string): void {
    this.refs.statusAction.textContent = action;
  }

  updateResult(status: UiStatus, detail?: string): void {
    this.refs.statusResult.textContent = STATUS_LABELS[status];
    this.refs.statusResult.dataset.state = status;
    if (detail) this.refs.statusResult.title = detail;
  }

  updateTranscript(actions: Action[], executed: number): void {
    this.refs.transcript.textContent = toTranscript(actions.slice(0, executed));
  }

  reset(robot: RobotState): void {
    this.updateRobot(robot);
    this.updateAction('아직 실행하지 않았어요');
    this.updateResult('idle');
    this.updateTranscript([], 0);
  }

  directionLabel(direction: Direction): string {
    return DIRECTION_LABELS_KO[direction];
  }
}
