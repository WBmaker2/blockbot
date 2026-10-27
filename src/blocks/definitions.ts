import * as Blockly from 'blockly';

let definitionsReady = false;

export function defineBlockBotBlocks(): void {
  if (definitionsReady) return;
  definitionsReady = true;

  Blockly.common.defineBlocksWithJsonArray([
    {
      type: 'bb_move',
      message0: '앞으로 한 칸',
      previousStatement: null,
      nextStatement: null,
      style: 'bb_motion',
      tooltip: '로봇을 바라보는 방향으로 한 칸 움직여요.',
      helpUrl: ''
    },
    {
      type: 'bb_turn_left',
      message0: '왼쪽으로 돌기',
      previousStatement: null,
      nextStatement: null,
      style: 'bb_turn',
      tooltip: '로봇이 제자리에서 왼쪽으로 90도 돌아요.',
      helpUrl: ''
    },
    {
      type: 'bb_turn_right',
      message0: '오른쪽으로 돌기',
      previousStatement: null,
      nextStatement: null,
      style: 'bb_turn',
      tooltip: '로봇이 제자리에서 오른쪽으로 90도 돌아요.',
      helpUrl: ''
    },
    {
      type: 'bb_repeat',
      message0: '%1 번 반복',
      args0: [
        {
          type: 'field_number',
          name: 'TIMES',
          value: 4,
          min: 1,
          max: 100,
          precision: 1
        }
      ],
      message1: '실행',
      args1: [{ type: 'input_statement', name: 'DO' }],
      previousStatement: null,
      nextStatement: null,
      style: 'bb_loop',
      tooltip: '안에 있는 블록을 정한 횟수만큼 반복해요.',
      helpUrl: ''
    },
    {
      type: 'bb_if_wall',
      message0: '만약 앞에 벽이 있으면',
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      message2: '아니면',
      args2: [{ type: 'input_statement', name: 'ELSE' }],
      previousStatement: null,
      nextStatement: null,
      style: 'bb_logic',
      tooltip: '로봇 앞 칸이 벽이면 참, 아니면 거짓 가지를 실행해요.',
      helpUrl: ''
    },
    {
      type: 'bb_if_goal',
      message0: '만약 앞에 목표가 있으면',
      message1: '%1',
      args1: [{ type: 'input_statement', name: 'DO' }],
      message2: '아니면',
      args2: [{ type: 'input_statement', name: 'ELSE' }],
      previousStatement: null,
      nextStatement: null,
      style: 'bb_logic',
      tooltip: '로봇 앞 칸이 목표이면 참, 아니면 거짓 가지를 실행해요.',
      helpUrl: ''
    }
  ]);
}
