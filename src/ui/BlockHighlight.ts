import type { BlockEditor } from '../blocks/workspace';

export function highlightBlock(
  editor: BlockEditor | null,
  blockId: string | null,
  enabled: boolean
): void {
  if (!editor) return;
  editor.highlight(enabled ? blockId : null);
}

export function clearBlockHighlight(editor: BlockEditor | null): void {
  editor?.highlight(null);
}
