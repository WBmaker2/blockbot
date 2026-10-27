import * as Blockly from 'blockly';
import * as Ko from 'blockly/msg/ko';
import type { Challenge } from '../lang/ast';
import { buildToolbox } from './toolbox';
import { defineBlockBotBlocks } from './definitions';
import { blockbotTheme } from './theme';

const koMessages = Object.fromEntries(
  Object.entries(Ko).filter(([key]) => key !== 'default')
) as Record<string, string>;
Blockly.setLocale(koMessages);

export interface BlockEditorOptions {
  initialWorkspace?: object | null;
  onChange?: () => void;
}

export class BlockEditor {
  readonly workspace: Blockly.WorkspaceSvg;
  private readonly container: HTMLElement;
  private disposed = false;
  private arrangeTimer: number | null = null;

  constructor(container: HTMLElement, challenge: Challenge, options: BlockEditorOptions = {}) {
    this.container = container;
    defineBlockBotBlocks();

    this.workspace = Blockly.inject(container, {
      renderer: 'zelos',
      theme: blockbotTheme,
      toolbox: buildToolbox(challenge),
      trashcan: true,
      sounds: false,
      grid: {
        spacing: 24,
        length: 1,
        colour: '#e9e0d0',
        snap: false
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.82,
        maxScale: 1.35,
        minScale: 0.42,
        pinch: true
      },
      move: {
        scrollbars: true,
        drag: true,
        wheel: false
      }
    });

    if (options.initialWorkspace) {
      try {
        Blockly.serialization.workspaces.load(options.initialWorkspace, this.workspace);
      } catch {
        this.workspace.clear();
      }
    }

    this.workspace.addChangeListener((event: Blockly.Events.Abstract) => {
      if (this.disposed || event.isUiEvent) return;
      options.onChange?.();
      this.scheduleOverlapCheck();
    });

    window.setTimeout(() => {
      this.resize();
      this.scheduleOverlapCheck();
    }, 0);
  }

  serialize(): object {
    return Blockly.serialization.workspaces.save(this.workspace);
  }

  highlight(blockId: string | null): void {
    try {
      this.workspace.highlightBlock(blockId);
    } catch {
      return;
    }
  }

  resize(): void {
    if (this.disposed) return;
    try {
      Blockly.svgResize(this.workspace);
    } catch {
      return;
    }
  }

  focus(): void {
    this.workspace.getCanvas().focus();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.arrangeTimer !== null) window.clearTimeout(this.arrangeTimer);
    this.workspace.dispose();
    this.container.innerHTML = '';
  }

  private scheduleOverlapCheck(): void {
    if (this.arrangeTimer !== null) return;
    this.arrangeTimer = window.setTimeout(() => {
      this.arrangeTimer = null;
      if (this.disposed) return;
      if (this.workspace.isDragging()) {
        this.scheduleOverlapCheck();
        return;
      }
      this.arrangeOverlappingBlocks();
    }, 60);
  }

  private arrangeOverlappingBlocks(): void {
    const blocks = this.workspace.getTopBlocks(true);
    let overlaps = false;
    for (let i = 0; i < blocks.length && !overlaps; i += 1) {
      const a = blocks[i]?.getRelativeToSurfaceXY();
      if (!a) continue;
      for (let j = i + 1; j < blocks.length; j += 1) {
        const b = blocks[j]?.getRelativeToSurfaceXY();
        if (!b) continue;
        if (Math.abs(a.x - b.x) < 24 && Math.abs(a.y - b.y) < 24) {
          overlaps = true;
          break;
        }
      }
    }
    if (overlaps) {
      this.workspace.cleanUp();
      this.resize();
    }
  }
}
