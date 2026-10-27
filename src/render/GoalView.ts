import * as THREE from 'three';
import type { Cell } from '../lang/ast';
import { cellToWorld } from './GridView';

export class GoalView {
  readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly beam: THREE.Mesh;
  private readonly disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  constructor(goal: Cell, width: number, depth: number) {
    const position = cellToWorld(goal, width, depth);

    const discGeometry = new THREE.CylinderGeometry(0.32, 0.32, 0.03, 32);
    const discMaterial = new THREE.MeshStandardMaterial({
      color: '#ffb648',
      emissive: '#ff8a1f',
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.3
    });
    const disc = new THREE.Mesh(discGeometry, discMaterial);
    disc.position.set(position.x, 0.075, position.z);
    this.group.add(disc);

    const ringGeometry = new THREE.TorusGeometry(0.31, 0.026, 12, 40);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: '#ffd27d' });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(position.x, 0.1, position.z);
    this.group.add(this.ring);

    const beamGeometry = new THREE.CylinderGeometry(0.06, 0.28, 1.15, 20, 1, true);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: '#ffb648',
      transparent: true,
      opacity: 0.13,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.beam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beam.position.set(position.x, 0.66, position.z);
    this.group.add(this.beam);

    const glow = new THREE.PointLight('#ffb648', 3.2, 3.2, 2);
    glow.position.set(position.x, 0.9, position.z);
    this.group.add(glow);

    this.disposables.push(
      discGeometry,
      discMaterial,
      ringGeometry,
      ringMaterial,
      beamGeometry,
      beamMaterial
    );
  }

  update(elapsed: number, reducedMotion: boolean): void {
    if (reducedMotion) {
      this.ring.scale.setScalar(1);
      (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.13;
      return;
    }
    const pulse = 1 + Math.sin(elapsed * 2.2) * 0.08;
    this.ring.scale.setScalar(pulse);
    this.ring.rotation.z = elapsed * 0.5;
    (this.beam.material as THREE.MeshBasicMaterial).opacity =
      0.1 + (Math.sin(elapsed * 2.2) + 1) * 0.035;
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
    this.group.clear();
  }
}
