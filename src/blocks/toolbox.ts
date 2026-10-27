import type { BlockType, Challenge } from '../lang/ast';
import { allowedBlockTypes } from '../features/challenges';

interface ToolboxBlock {
  kind: 'block';
  type: string;
}

interface ToolboxCategory {
  kind: 'category';
  name: string;
  colour: string;
  contents: ToolboxBlock[];
}

export interface ToolboxDefinition {
  kind: 'categoryToolbox';
  contents: ToolboxCategory[];
}

export function buildToolbox(challenge: Challenge): ToolboxDefinition {
  const allowed = new Set<BlockType>(allowedBlockTypes(challenge));
  const contents: ToolboxCategory[] = [];

  const motion: ToolboxBlock[] = [];
  if (allowed.has('bb_move')) motion.push({ kind: 'block', type: 'bb_move' });
  if (allowed.has('bb_turn_left')) motion.push({ kind: 'block', type: 'bb_turn_left' });
  if (allowed.has('bb_turn_right')) motion.push({ kind: 'block', type: 'bb_turn_right' });
  if (motion.length > 0) {
    contents.push({ kind: 'category', name: '동작', colour: '#2fbf8f', contents: motion });
  }

  const loops: ToolboxBlock[] = [];
  if (allowed.has('bb_repeat')) loops.push({ kind: 'block', type: 'bb_repeat' });
  if (loops.length > 0) {
    contents.push({ kind: 'category', name: '반복', colour: '#ff7d5c', contents: loops });
  }

  const logic: ToolboxBlock[] = [];
  if (allowed.has('bb_if_wall')) logic.push({ kind: 'block', type: 'bb_if_wall' });
  if (allowed.has('bb_if_goal')) logic.push({ kind: 'block', type: 'bb_if_goal' });
  if (logic.length > 0) {
    contents.push({ kind: 'category', name: '조건', colour: '#7b8cff', contents: logic });
  }

  return { kind: 'categoryToolbox', contents };
}
