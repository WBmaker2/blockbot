import * as THREE from 'three';
import type { Cell } from '../lang/ast';

export function cellToWorld(cell: Cell, width: number, depth: number): THREE.Vector3 {
  return new THREE.Vector3(cell.x - (width - 1) / 2, 0, cell.z - (depth - 1) / 2);
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, 128, 128);
    context.fillStyle = '#b6c9e8';
    context.font = '600 56px "Pretendard", "Apple SD Gothic Neo", system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 64, 68);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.38, 0.38, 1);
  return sprite;
}

export class GridView {
  readonly group = new THREE.Group();
  private readonly labels = new THREE.Group();
  private readonly disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];

  constructor(width: number, depth: number) {
    const geometry = new THREE.BoxGeometry(0.94, 0.08, 0.94);
    const materialA = new THREE.MeshStandardMaterial({
      color: '#1c2d4d',
      roughness: 0.9,
      metalness: 0.02
    });
    const materialB = new THREE.MeshStandardMaterial({
      color: '#223657',
      roughness: 0.9,
      metalness: 0.02
    });
    this.disposables.push(geometry, materialA, materialB);

    for (let x = 0; x < width; x += 1) {
      for (let z = 0; z < depth; z += 1) {
        const tile = new THREE.Mesh(geometry, (x + z) % 2 === 0 ? materialA : materialB);
        const position = cellToWorld({ x, z }, width, depth);
        tile.position.set(position.x, 0, position.z);
        tile.receiveShadow = true;
        this.group.add(tile);
      }
    }

    const borderGeometry = new THREE.BoxGeometry(width + 0.18, 0.06, depth + 0.18);
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: '#0c1628',
      roughness: 0.85
    });
    this.disposables.push(borderGeometry, borderMaterial);
    const border = new THREE.Mesh(borderGeometry, borderMaterial);
    border.position.y = -0.06;
    border.receiveShadow = true;
    this.group.add(border);

    for (let x = 0; x < width; x += 1) {
      const sprite = makeLabel(String(x));
      const position = cellToWorld({ x, z: depth - 1 }, width, depth);
      sprite.position.set(position.x, 0.12, position.z + 0.82);
      this.labels.add(sprite);
    }
    for (let z = 0; z < depth; z += 1) {
      const sprite = makeLabel(String(z));
      const position = cellToWorld({ x: 0, z }, width, depth);
      sprite.position.set(position.x - width / 2 - 0.15, 0.12, position.z);
      this.labels.add(sprite);
    }
    this.group.add(this.labels);
    this.labels.visible = false;
  }

  setCoordinatesVisible(visible: boolean): void {
    this.labels.visible = visible;
  }

  dispose(): void {
    for (const child of this.labels.children) {
      if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    }
    for (const item of this.disposables) item.dispose();
    this.group.clear();
  }
}
