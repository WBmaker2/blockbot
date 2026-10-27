import * as THREE from 'three';
import type { Cell } from '../lang/ast';
import { cellToWorld } from './GridView';

export class WallView {
  readonly group = new THREE.Group();
  private readonly disposables: Array<THREE.BufferGeometry | THREE.Material> = [];

  constructor(walls: Cell[], width: number, depth: number) {
    if (walls.length === 0) return;

    const geometry = new THREE.BoxGeometry(0.86, 0.9, 0.86);
    const material = new THREE.MeshStandardMaterial({
      color: '#2a3e66',
      roughness: 0.7,
      metalness: 0.12
    });
    const capGeometry = new THREE.BoxGeometry(0.9, 0.08, 0.9);
    const capMaterial = new THREE.MeshStandardMaterial({
      color: '#48639a',
      roughness: 0.55,
      metalness: 0.2
    });
    this.disposables.push(geometry, material, capGeometry, capMaterial);

    walls.forEach((cell) => {
      const position = cellToWorld(cell, width, depth);
      const wall = new THREE.Mesh(geometry, material);
      wall.position.set(position.x, 0.45, position.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.group.add(wall);

      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.set(position.x, 0.94, position.z);
      cap.castShadow = true;
      this.group.add(cap);
    });
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose();
    this.group.clear();
  }
}
