import type { BlockType, Challenge } from '../lang/ast';
import { allowedBlockTypes } from '../features/challenges';

interface ToolboxBlock {
  kind: 'block';
  type: string;
}

interface ToolboxLabel {
  kind: 'label';
  text: string;
}

type ToolboxItem = ToolboxBlock | ToolboxLabel;

export interface ToolboxDefinition {
  kind: 'flyoutToolbox';
  contents: ToolboxItem[];
}

export function buildToolbox(challenge: Challenge): ToolboxDefinition {
  const allowed = new Set<BlockType>(allowedBlockTypes(challenge));
  const contents: ToolboxItem[] = [];

  const motion: ToolboxBlock[] = [];
  if (allowed.has('bb_move')) motion.push({ kind: 'block', type: 'bb_move' });
  if (allowed.has('bb_turn_left')) motion.push({ kind: 'block', type: 'bb_turn_left' });
  if (allowed.has('bb_turn_right')) motion.push({ kind: 'block', type: 'bb_turn_right' });
  if (motion.length > 0) {
    contents.push({ kind: 'label', text: '동작' }, ...motion);
  }

  if (allowed.has('bb_repeat')) {
    contents.push({ kind: 'label', text: '반복' }, { kind: 'block', type: 'bb_repeat' });
  }

  const logic: ToolboxBlock[] = [];
  if (allowed.has('bb_if_wall')) logic.push({ kind: 'block', type: 'bb_if_wall' });
  if (allowed.has('bb_if_goal')) logic.push({ kind: 'block', type: 'bb_if_goal' });
  if (logic.length > 0) {
    contents.push({ kind: 'label', text: '조건' }, ...logic);
  }

  return { kind: 'flyoutToolbox', contents };
}
