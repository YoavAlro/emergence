import type { DoodleIcon } from '../ui/doodle';

export type PowerUpId = 'magnet' | 'turbo' | 'shield' | 'double' | 'bigmouth';

export interface PowerUpSpec {
  id: PowerUpId;
  name: string;
  blurb: string;
  /** How long it lasts. The shield lasts until it blocks a hit or runs out. */
  seconds: number;
  color: number;
  icon: DoodleIcon;
  /** Relative spawn chance. */
  weight: number;
}

/** Timed power-ups that drift through the ocean. Pure game-feel; no history here. */
export const POWER_UPS: PowerUpSpec[] = [
  { id: 'magnet', name: 'Data Magnet', blurb: 'The data you need swims to you.', seconds: 9, color: 0xff5c7a, icon: 'magnet', weight: 3 },
  { id: 'turbo', name: 'Spare GPUs', blurb: 'Free boost, no compute cost.', seconds: 7, color: 0xffd84d, icon: 'bolt', weight: 3 },
  { id: 'shield', name: 'Safety Filter', blurb: 'Blocks the next hit.', seconds: 25, color: 0x5ec8f2, icon: 'shield', weight: 2 },
  { id: 'double', name: 'Viral Moment', blurb: 'Double points.', seconds: 10, color: 0xff9ad5, icon: 'double', weight: 2 },
  { id: 'bigmouth', name: 'Longer Context', blurb: 'Eat from much farther away.', seconds: 10, color: 0xb48cff, icon: 'mouth', weight: 2 },
];

/** Seconds between power-up spawns (random in this range). */
export const POWER_UP_EVERY: [number, number] = [22, 38];
