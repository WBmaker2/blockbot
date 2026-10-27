import * as THREE from 'three';
import type { Direction, RobotState } from '../lang/ast';
import { yawForDirection } from '../world/robot';
import { cellToWorld } from './GridView';

export class RobotView {
  readonly group = new THREE.Group();
  private readonly disposables: Array<THREE.BufferGeometry | THREE.Material> = [];
  private readonly antennaLight: THREE.Mesh;

  constructor() {
    const dark = new THREE.MeshStandardMaterial({
      color: '#0c1628',
      roughness: 0.5,
      metalness: 0.35
    });
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: '#57d3a5',
      roughness: 0.32,
      metalness: 0.18
    });
    const headMaterial = new THREE.MeshStandardMaterial({
      color: '#7ee7c0',
      roughness: 0.28,
      metalness: 0.15
    });
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: '#0b1424',
      emissive: '#0b1424',
      roughness: 0.2
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: '#ffb648',
      emissive: '#ff8a1f',
      emissiveIntensity: 0.7,
      roughness: 0.35
    });

    const baseGeometry = new THREE.CylinderGeometry(0.3, 0.32, 0.06, 24);
    const bodyGeometry = new THREE.BoxGeometry(0.48, 0.32, 0.42);
    const headGeometry = new THREE.BoxGeometry(0.36, 0.22, 0.34);
    const eyeGeometry = new THREE.BoxGeometry(0.07, 0.09, 0.03);
    const antennaGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8);
    const lightGeometry = new THREE.SphereGeometry(0.04, 12, 12);
    const arrowGeometry = new THREE.ConeGeometry(0.07, 0.16, 3);

    this.disposables.push(
      baseGeometry,
      bodyGeometry,
      headGeometry,
      eyeGeometry,
      antennaGeometry,
      lightGeometry,
      arrowGeometry,
      dark,
      bodyMaterial,
      headMaterial,
      eyeMaterial,
      accentMaterial
    );

    const base = new THREE.Mesh(baseGeometry, dark);
    base.position.y = 0.045;
    base.castShadow = true;
    this.group.add(base);

    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    this.group.add(body);

    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.5;
    head.castShadow = true;
    this.group.add(head);

    const eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeLeft.position.set(-0.08, 0.52, 0.18);
    this.group.add(eyeLeft);

    const eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    eyeRight.position.set(0.08, 0.52, 0.18);
    this.group.add(eyeRight);

    const antenna = new THREE.Mesh(antennaGeometry, dark);
    antenna.position.set(0, 0.68, 0);
    this.group.add(antenna);

    this.antennaLight = new THREE.Mesh(lightGeometry, accentMaterial);
    this.antennaLight.position.set(0, 0.78, 0);
    this.group.add(this.antennaLight);

    const arrow = new THREE.Mesh(arrowGeometry, accentMaterial);
    arrow.position.set(0, 0.04, 0.4);
    arrow.rotation.x = Math.PI / 2;
    this.group.add(arrow);
  }

  setPose(robot: RobotState, width: number, depth: number): void {
    const position = cellToWorld(robot, width, depth);
    this.group.position.set(position.x, 0.08, position.z);
    this.group.rotation.y = yawForDirection(robot.dir);
  }

  pulse(elapsed: number, reducedMotion: boolean): void {
    const scale = reducedMotion ? 1 : 1 + Math.sin(elapsed * 3.4) * 0.12;
    this.antennaLight.scale.setScalar(scale);
  }

  setTargetYaw(dir: Direction): number {
    return yawForDirection(dir);
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
    this.group.clear();
  }
}
