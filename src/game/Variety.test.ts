import { describe, expect, it } from 'vitest';
import { BOSSES } from '../config/bosses';
import { CHALLENGES, CHALLENGE_GAP } from '../config/challenges';
import { HERO_STYLE } from '../config/labs';
import { POWER_UPS, POWER_UP_EVERY } from '../config/powerups';
import { Challenges } from './Challenges';
import { PowerUps, pickWeighted } from './PowerUps';

describe('PowerUps', () => {
  it('spawns one within the spawn window and times out', () => {
    const p = new PowerUps(() => 0.5);
    let spawned = null;
    let t = 0;
    while (!spawned && t < 60) {
      spawned = p.update(1);
      t++;
    }
    expect(t).toBeGreaterThanOrEqual(POWER_UP_EVERY[0]);
    expect(t).toBeLessThanOrEqual(POWER_UP_EVERY[1] + 1);
    p.grant('turbo');
    expect(p.has('turbo')).toBe(true);
    for (let i = 0; i < 20; i++) p.update(1);
    expect(p.has('turbo')).toBe(false);
  });

  it('lets the shield absorb exactly one hit', () => {
    const p = new PowerUps();
    expect(p.absorbHit()).toBe(false);
    p.grant('shield');
    expect(p.absorbHit()).toBe(true);
    expect(p.absorbHit()).toBe(false);
  });

  it('picks by weight and covers every power-up', () => {
    const seen = new Set(Array.from({ length: 100 }, (_, i) => pickWeighted(POWER_UPS, i / 100).id));
    expect(seen.size).toBe(POWER_UPS.length);
  });
});

describe('Challenges', () => {
  const run = (c: Challenges, secs: number, busy = false) => {
    const out = [];
    for (let i = 0; i < secs * 10; i++) out.push(...c.update(0.1, busy, 7, 'books'));
    return out;
  };

  it('starts after a calm gap, not during events', () => {
    const c = new Challenges(() => 0);
    expect(run(c, CHALLENGE_GAP + 1, true)).toEqual([]);
    const out = run(c, CHALLENGE_GAP + 0.5);
    expect(out[0]?.type).toBe('start');
    expect(c.active?.text).not.toContain('{type}');
  });

  it('wins eat challenges by eating the asked type', () => {
    const c = new Challenges(() => 0);
    run(c, CHALLENGE_GAP + 0.5);
    expect(c.active?.spec.goal.kind).toBe('eatType');
    for (let i = 0; i < 12; i++) c.eat('books', 'books');
    const out = c.update(0.1, false, 7, 'books');
    expect(out).toEqual([expect.objectContaining({ type: 'end', won: true })]);
  });

  it('fails a no-hit challenge on a hit, and wins it by surviving', () => {
    const noHit = CHALLENGES.findIndex((s) => s.goal.kind === 'noHit');
    const pickNoHit = () => noHit / CHALLENGES.length + 0.001;
    const c = new Challenges(pickNoHit);
    run(c, CHALLENGE_GAP + 0.5);
    expect(c.active?.spec.goal.kind).toBe('noHit');
    c.hit();
    expect(c.update(0.1, false, 7, null)).toEqual([expect.objectContaining({ won: false })]);
    const d = new Challenges(pickNoHit);
    run(d, CHALLENGE_GAP + 0.5);
    const ends = run(d, 30).filter((e) => e.type === 'end');
    expect(ends[0]).toEqual(expect.objectContaining({ won: true }));
  });
});

describe('variety content', () => {
  it('has a hero style for each lineage', () => {
    for (const l of ['gpt', 'claude'] as const) expect(HERO_STYLE[l].body).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('uses every boss pattern somewhere, and finale bosses mix several', () => {
    const patterns = new Set(BOSSES.flatMap((b) => [b.boss!.pattern].flat()));
    expect(patterns).toEqual(new Set(['charge', 'spray', 'summon', 'orbit', 'bounce', 'shockwave']));
    expect(BOSSES.filter((b) => Array.isArray(b.boss!.pattern)).length).toBeGreaterThanOrEqual(2);
  });
});
