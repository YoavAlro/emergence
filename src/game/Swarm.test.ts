import { describe, expect, it } from 'vitest';
import { BASE_FORKS, TEAM_BONUS, leakCount, maxForks, spreadInfection } from './swarmRules';

describe('swarm rules', () => {
  it('adds fork slots for parts and Agent Teams', () => {
    expect(maxForks(0, false)).toBe(BASE_FORKS);
    expect(maxForks(3, true)).toBe(BASE_FORKS + 3 + TEAM_BONUS);
  });

  it('spreads prompt injections only to nearby forks', () => {
    const positions = [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 50, y: 0, z: 0 },
    ];
    const infected = spreadInfection(positions, [true, false, false], false, 1, () => 0);
    expect(infected).toEqual([1]);
  });

  it('does not spread through an injection shield', () => {
    const positions = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
    ];
    expect(spreadInfection(positions, [true, false], true, 1, () => 0)).toEqual([]);
  });

  it('leaks at least one fork in a security exposure', () => {
    expect(leakCount(0, 0.5)).toBe(0);
    expect(leakCount(1, 0.1)).toBe(1);
    expect(leakCount(8, 0.5)).toBe(4);
  });
});
