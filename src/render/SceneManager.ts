import * as THREE from 'three';
import type { Challenge, RobotState } from '../lang/ast';
import { CameraRig } from './CameraRig';
import { GridView, cellToWorld } from './GridView';
import { GoalView } from './GoalView';
import { RobotView } from './RobotView';
import { WallView } from './WallView';
import { yawForDirection } from '../world/robot';

interface Tween {
  start: number;
  duration: number;
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromYaw: number;
  toYaw: number;
  resolve: () => void;
}

const EASE = (value: number): number => {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

export class SceneManager {
  private readonly container: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: CameraRig;
  private readonly worldGroup = new THREE.Group();
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private gridView: GridView | null = null;
  private wallView: WallView | null = null;
  private goalView: GoalView | null = null;
  private robotView: RobotView | null = null;
  private challenge: Challenge | null = null;
  private tween: Tween | null = null;
  private frame = 0;
  private reducedMotion = false;
  private coordinatesVisible = true;
  private mobile = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'scene-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');

    this.scene.background = new THREE.Color('#0b1424');
    this.scene.fog = new THREE.Fog('#0b1424', 20, 44);
    this.scene.add(this.worldGroup);

    this.cameraRig = new CameraRig(this.renderer.domElement);

    this.setupLights();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderLoop();
  }

  setChallenge(challenge: Challenge): void {
    this.challenge = challenge;
    this.clearWorld();

    this.gridView = new GridView(challenge.grid.width, challenge.grid.depth);
    this.gridView.setCoordinatesVisible(this.coordinatesVisible);
    this.wallView = new WallView(challenge.walls, challenge.grid.width, challenge.grid.depth);
    this.goalView = new GoalView(challenge.goal, challenge.grid.width, challenge.grid.depth);
    this.robotView = new RobotView();

    this.worldGroup.add(
      this.gridView.group,
      this.wallView.group,
      this.goalView.group,
      this.robotView.group
    );
    this.robotView.setPose(challenge.robot, challenge.grid.width, challenge.grid.depth);

    this.mobile = window.matchMedia('(max-width: 767px)').matches;
    this.cameraRig.frameGrid(challenge.grid.width, challenge.grid.depth, this.mobile);
    this.resize();
  }

  resetRobot(robot: RobotState): void {
    this.finishTween();
    if (!this.challenge || !this.robotView) return;
    this.robotView.setPose(robot, this.challenge.grid.width, this.challenge.grid.depth);
  }

  animateMove(from: RobotState, toDirection: RobotState, durationMs: number): Promise<void> {
    if (!this.challenge || !this.robotView) return Promise.resolve();
    this.finishTween();

    const fromPosition = cellToWorld(from, this.challenge.grid.width, this.challenge.grid.depth);
    fromPosition.y = 0.08;
    const toPosition = cellToWorld(
      { x: toDirection.x, z: toDirection.z },
      this.challenge.grid.width,
      this.challenge.grid.depth
    );
    toPosition.y = 0.08;

    this.robotView.group.position.copy(fromPosition);
    this.robotView.group.rotation.y = yawForDirection(toDirection.dir);

    if (this.reducedMotion || durationMs <= 0) {
      this.robotView.group.position.copy(toPosition);
      return Promise.resolve();
    }
    return this.startTween(
      fromPosition,
      toPosition,
      this.robotView.group.rotation.y,
      this.robotView.group.rotation.y,
      durationMs
    );
  }

  animateTurn(from: RobotState, to: RobotState, durationMs: number): Promise<void> {
    if (!this.challenge || !this.robotView) return Promise.resolve();
    this.finishTween();
    const position = cellToWorld(from, this.challenge.grid.width, this.challenge.grid.depth);
    position.y = 0.08;
    this.robotView.group.position.copy(position);
    const fromYaw = yawForDirection(from.dir);
    const toYaw = yawForDirection(to.dir);
    let delta = toYaw - fromYaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.robotView.group.rotation.y = fromYaw;

    if (this.reducedMotion || durationMs <= 0) {
      this.robotView.group.rotation.y = toYaw;
      return Promise.resolve();
    }
    return this.startTween(position, position, fromYaw, fromYaw + delta, durationMs);
  }

  setPose(robot: RobotState): void {
    if (!this.challenge || !this.robotView) return;
    this.finishTween();
    this.robotView.setPose(robot, this.challenge.grid.width, this.challenge.grid.depth);
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  setCoordinatesVisible(visible: boolean): void {
    this.coordinatesVisible = visible;
    this.gridView?.setCoordinatesVisible(visible);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.resizeObserver.disconnect();
    this.clearWorld();
    this.cameraRig.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.scene.clear();
  }

  private setupLights(): void {
    const ambient = new THREE.HemisphereLight('#cfe3ff', '#0a1120', 1.55);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight('#fff4dd', 2.1);
    key.position.set(7, 12, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 32;
    key.shadow.camera.left = -9;
    key.shadow.camera.right = 9;
    key.shadow.camera.top = 9;
    key.shadow.camera.bottom = -9;
    key.shadow.bias = -0.001;
    this.scene.add(key);

    const rim = new THREE.DirectionalLight('#69e4c0', 0.8);
    rim.position.set(-8, 5, -7);
    this.scene.add(rim);
  }

  private startTween(
    fromPosition: THREE.Vector3,
    toPosition: THREE.Vector3,
    fromYaw: number,
    toYaw: number,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      this.robotView?.group.position.copy(fromPosition);
      if (this.robotView) this.robotView.group.rotation.y = fromYaw;
      this.tween = {
        start: performance.now(),
        duration,
        fromPosition: fromPosition.clone(),
        toPosition: toPosition.clone(),
        fromYaw,
        toYaw,
        resolve
      };
    });
  }

  private finishTween(): void {
    if (!this.tween) return;
    const tween = this.tween;
    this.tween = null;
    if (this.robotView) {
      this.robotView.group.position.copy(tween.toPosition);
      this.robotView.group.rotation.y = tween.toYaw;
    }
    tween.resolve();
  }

  private clearWorld(): void {
    this.finishTween();
    this.gridView?.dispose();
    this.wallView?.dispose();
    this.goalView?.dispose();
    this.robotView?.dispose();
    this.worldGroup.clear();
    this.gridView = null;
    this.wallView = null;
    this.goalView = null;
    this.robotView = null;
    this.tween = null;
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height, false);
    this.cameraRig.setViewport(width, height);
    const nowMobile = window.matchMedia('(max-width: 767px)').matches;
    if (this.challenge && nowMobile !== this.mobile) {
      this.mobile = nowMobile;
      this.cameraRig.frameGrid(this.challenge.grid.width, this.challenge.grid.depth, this.mobile);
    }
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else if (!this.frame) {
      this.clock.start();
      this.renderLoop();
    }
  };

  private renderLoop = (): void => {
    this.frame = requestAnimationFrame(this.renderLoop);
    const now = performance.now();
    const elapsed = this.clock.getElapsedTime();

    if (this.tween) {
      const progress = Math.min(1, (now - this.tween.start) / this.tween.duration);
      const eased = EASE(progress);
      if (this.robotView) {
        this.robotView.group.position.lerpVectors(
          this.tween.fromPosition,
          this.tween.toPosition,
          eased
        );
        this.robotView.group.position.y = 0.08 + Math.sin(eased * Math.PI) * 0.12;
        this.robotView.group.rotation.y =
          this.tween.fromYaw + (this.tween.toYaw - this.tween.fromYaw) * eased;
      }
      if (progress >= 1) {
        this.finishTween();
      }
    }

    this.goalView?.update(elapsed, this.reducedMotion);
    this.robotView?.pulse(elapsed, this.reducedMotion);
    this.cameraRig.update();
    this.renderer.render(this.scene, this.cameraRig.camera);
  };
}
