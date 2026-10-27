import * as Blockly from 'blockly';

export const blockbotTheme = Blockly.Theme.defineTheme('blockbot', {
  name: 'blockbot',
  base: Blockly.Themes.Classic,
  blockStyles: {
    bb_motion: {
      colourPrimary: '#2fbf8f',
      colourSecondary: '#26a87c',
      colourTertiary: '#1d8662'
    },
    bb_turn: {
      colourPrimary: '#ffb648',
      colourSecondary: '#e89f32',
      colourTertiary: '#c78622'
    },
    bb_loop: {
      colourPrimary: '#ff7d5c',
      colourSecondary: '#e96b4b',
      colourTertiary: '#c95538'
    },
    bb_logic: {
      colourPrimary: '#7b8cff',
      colourSecondary: '#6878e8',
      colourTertiary: '#5563c4'
    }
  },
  componentStyles: {
    workspaceBackgroundColour: '#fffaf0',
    toolboxBackgroundColour: '#101a2e',
    toolboxForegroundColour: '#f8f2e4',
    flyoutBackgroundColour: '#172440',
    flyoutForegroundColour: '#f8f2e4',
    flyoutOpacity: 1,
    scrollbarColour: '#c8bca8',
    scrollbarOpacity: 0.55,
    insertionMarkerColour: '#101a2e',
    insertionMarkerOpacity: 0.35,
    markerColour: '#ffb648',
    cursorColour: '#ffb648',
    selectedGlowColour: '#ffb648',
    selectedGlowOpacity: 0.5
  },
  fontStyle: {
    family: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    weight: '600',
    size: 12
  }
});
