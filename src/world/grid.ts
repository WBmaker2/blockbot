import type { Cell } from '../lang/ast';

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.z}`;
}

export function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.z === b.z;
}

export class Grid {
  readonly width: number;
  readonly depth: number;
  readonly goal: Cell;
  private readonly walls: Set<string>;

  constructor(width: number, depth: number, walls: Cell[], goal: Cell) {
    this.width = width;
    this.depth = depth;
    this.goal = { ...goal };
    this.walls = new Set(walls.map(cellKey));
  }

  isInside(cell: Cell): boolean {
    return cell.x >= 0 && cell.z >= 0 && cell.x < this.width && cell.z < this.depth;
  }

  isWall(cell: Cell): boolean {
    return this.walls.has(cellKey(cell));
  }

  isBlocked(cell: Cell): boolean {
    return !this.isInside(cell) || this.isWall(cell);
  }

  hasWall(cell: Cell): boolean {
    return this.isWall(cell);
  }

  wallCells(): Cell[] {
    return [...this.walls].map((key) => {
      const [x, z] = key.split(',').map(Number);
      return { x, z };
    });
  }
}
