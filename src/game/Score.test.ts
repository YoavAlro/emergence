import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, SKINS } from '../config/achievements';
import { Meta } from './Meta';
import { BASE_POINTS, COMBO_WINDOW, Score } from './Score';

describe('Score', () => {
  it('builds a combo multiplier from quick on-diet bites', () => {
    const s = new Score();
    let t = 0;
    for (let i = 0; i < 16; i++) s.eat((t += 0.2), true);
    expect(s.combo).toBe(16);
    expect(s.multiplier()).toBe(2);
    expect(s.eat((t += 0.2), true).points).toBe(BASE_POINTS * 2);
  });

  it('caps the multiplier at ×5', () => {
    const s = new Score();
    for (let i = 0; i < 200; i++) s.eat(i * 0.1, true);
    expect(s.multiplier()).toBe(5);
  });

  it('resets the combo after a pause, and scores off-diet bites lower', () => {
    const s = new Score();
    s.eat(0, true);
    s.eat(0.5, true);
    expect(s.combo).toBe(2);
    const r = s.eat(0.5 + COMBO_WINDOW + 0.1, false);
    expect(r.combo).toBe(0);
    expect(r.points).toBe(3);
  });

  it('calls out combo milestones once', () => {
    const s = new Score();
    const callouts: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = s.eat(i * 0.1, true);
      if (r.callout) callouts.push(r.callout);
    }
    expect(callouts).toEqual(['Nice streak!', 'On a roll!']);
  });

  it('breaks the combo and keeps the best', () => {
    const s = new Score();
    for (let i = 0; i < 12; i++) s.eat(i * 0.1, true);
    expect(s.break()).toBe(12);
    expect(s.combo).toBe(0);
    expect(s.bestCombo).toBe(12);
  });
});

describe('Meta (achievements)', () => {
  it('unlocks achievements when stats cross thresholds, once', () => {
    const m = new Meta();
    expect(m.bump('eaten', 1).map((a) => a.id)).toEqual(['tokenized']);
    expect(m.bump('eaten', 1)).toEqual([]);
    expect(m.bump('eaten', 600).map((a) => a.id)).toEqual(['library']);
  });

  it('keeps maxima for combo and score stats', () => {
    const m = new Meta();
    m.bump('maxCombo', 40);
    m.bump('maxCombo', 5);
    expect(m.stat('maxCombo')).toBe(40);
    expect(m.has('frenzy')).toBe(true);
  });

  it('unlocks skins through achievements', () => {
    const m = new Meta();
    const party = SKINS.find((s) => s.id === 'party')!;
    expect(m.skinUnlocked(party)).toBe(false);
    m.bump('maxCombo', 30);
    expect(m.skinUnlocked(party)).toBe(true);
    m.data.skin = 'golden';
    expect(m.skin.id).toBe('classic'); // locked skins fall back
  });

  it('records high scores per lineage', () => {
    const m = new Meta();
    expect(m.recordScore('gpt', 100)).toBe(true);
    expect(m.recordScore('gpt', 50)).toBe(false);
    expect(m.data.highScores.gpt).toBe(100);
  });

  it('has unique achievement ids and skins that point at real achievements', () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const s of SKINS) if (s.unlock) expect(ACHIEVEMENTS.some((a) => a.id === s.unlock)).toBe(true);
  });
});
