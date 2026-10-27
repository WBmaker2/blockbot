import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  constructor(domElement: HTMLElement) {
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(7, 8.5, 9);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.target.set(0, 0.2, 0);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = 1.32;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 24;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.7;
    this.controls.update();
  }

  frameGrid(width: number, depth: number, mobile = false): void {
    const size = Math.max(width, depth);
    const position = mobile
      ? new THREE.Vector3(size * 1.0, size * 1.86, size * 1.48)
      : new THREE.Vector3(size * 1.1, size * 1.32, size * 1.42);
    this.camera.position.copy(position);
    this.controls.target.set(0, 0.25, 0);
    this.controls.enableRotate = !mobile;
    this.controls.enabled = true;
    this.controls.update();
  }

  setViewport(width: number, height: number): void {
    const aspect = width / Math.max(1, height);
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.9 ? 48 : 40;
    this.camera.updateProjectionMatrix();
  }

  update(): void {
    if (this.controls.enabled) this.controls.update();
  }

  dispose(): void {
    this.controls.dispose();
  }
}
