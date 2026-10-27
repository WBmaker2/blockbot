export type StarCount = 1 | 2 | 3;

export function starsForBlockCount(blockCount: number, parBlocks: number): StarCount {
  if (blockCount <= parBlocks) return 3;
  if (blockCount <= parBlocks + 2) return 2;
  return 1;
}

export function starsLabel(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
}
