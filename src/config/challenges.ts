import type { DataTypeId } from './dataTypes';

/**
 * Quick side challenges that pop up between events. `{type}` in the text is
 * filled with the data type's label. Pure game-feel content.
 */
export type ChallengeGoal =
  | { kind: 'eatType'; type: 'wanted'; count: number }
  | { kind: 'eatAny'; count: number }
  | { kind: 'combo'; count: number }
  | { kind: 'noHit' }
  | { kind: 'powerUp' };

export interface ChallengeSpec {
  id: string;
  text: string;
  seconds: number;
  goal: ChallengeGoal;
  points: number;
  /** Only from this stage on. */
  fromStage?: number;
}

export const CHALLENGES: ChallengeSpec[] = [
  { id: 'snack', text: 'Snack attack: eat 12 {type} in 20s', seconds: 20, goal: { kind: 'eatType', type: 'wanted', count: 12 }, points: 600 },
  { id: 'binge', text: 'Binge-train: eat 25 pieces in 20s', seconds: 20, goal: { kind: 'eatAny', count: 25 }, points: 700 },
  { id: 'streak', text: 'Streak! Reach a 15 combo', seconds: 25, goal: { kind: 'combo', count: 15 }, points: 800 },
  { id: 'megastreak', text: 'Mega streak: reach a 30 combo', seconds: 35, goal: { kind: 'combo', count: 30 }, points: 1500, fromStage: 3 },
  { id: 'untouchable', text: 'Untouchable: no hits for 25s', seconds: 25, goal: { kind: 'noHit' }, points: 700 },
  { id: 'shopper', text: 'Power shopper: grab a power-up', seconds: 30, goal: { kind: 'powerUp' }, points: 500 },
];

/** Calm seconds before a challenge appears. */
export const CHALLENGE_GAP = 14;

export type WantedPicker = () => DataTypeId | null;
