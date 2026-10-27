import challengesJson from '../../data/challenges.json';
import type { BlockType, Challenge } from '../../lang/ast';

export const CHALLENGES = challengesJson as Challenge[];

export const BLOCK_TYPE_BY_NAME: Record<string, BlockType> = {
  move: 'bb_move',
  turn_left: 'bb_turn_left',
  turn_right: 'bb_turn_right',
  repeat: 'bb_repeat',
  if_wall: 'bb_if_wall',
  if_goal: 'bb_if_goal'
};

export function getChallenge(id: string): Challenge {
  const challenge = CHALLENGES.find((candidate) => candidate.id === id);
  return challenge ?? (CHALLENGES[0] as Challenge);
}

export function getChallengeIndex(id: string): number {
  return CHALLENGES.findIndex((candidate) => candidate.id === id);
}

export function allowedBlockTypes(challenge: Challenge): BlockType[] {
  return challenge.allowedBlocks
    .map((name) => BLOCK_TYPE_BY_NAME[name])
    .filter((type): type is BlockType => Boolean(type));
}
