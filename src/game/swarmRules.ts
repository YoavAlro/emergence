/** Pure rules for the Swarm (Stage 6). */

export const FORK_COST = 18;
export const BASE_FORKS = 4;
export const TEAM_BONUS = 2;
/** Without Agent Teams, a fork brings back this much before returning to you. */
export const CARRY_CAPACITY = 3;
export const INFECT_RADIUS = 5;
/** Chance per second that a rogue fork infects each nearby healthy fork. */
export const INFECT_RATE = 0.6;
/** Compute drained per second by each rogue fork (a cost blowup). */
export const ROGUE_DRAIN = 1.2;

export function maxForks(extraSlots: number, teams: boolean): number {
  return BASE_FORKS + extraSlots + (teams ? TEAM_BONUS : 0);
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

const dist2 = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

/**
 * Prompt injections spread between agents: returns the indices of healthy
 * forks that become rogue this tick.
 */
export function spreadInfection(
  positions: Point[],
  rogue: boolean[],
  shielded: boolean,
  dt: number,
  rng: () => number = Math.random,
): number[] {
  if (shielded) return [];
  const infected: number[] = [];
  const r2 = INFECT_RADIUS * INFECT_RADIUS;
  for (let i = 0; i < positions.length; i++) {
    if (rogue[i]) continue;
    for (let j = 0; j < positions.length; j++) {
      if (!rogue[j] || dist2(positions[i], positions[j]) > r2) continue;
      if (rng() < INFECT_RATE * dt) {
        infected.push(i);
        break;
      }
    }
  }
  return infected;
}

/** Picks which forks go rogue in a security exposure: the first `fraction` of them, at least one. */
export function leakCount(total: number, fraction: number): number {
  if (total === 0) return 0;
  return Math.max(1, Math.round(total * fraction));
}
