import { describe, expect, it } from 'vitest';
import { GPT_FORMS } from '../config/gptForms';
import {
  COLLAPSE_SHARE,
  OVERFIT_STREAK,
  RunState,
  combineModifiers,
  formatUsers,
  gateChecks,
  rolloutPhase,
} from './RunState';
import { emptyCounts } from './Progress';

describe('RunState', () => {
  it('unlocks abilities cumulatively as forms are reached', () => {
    const codex = GPT_FORMS.findIndex((f) => f.id === 'codex');
    const chatgpt = GPT_FORMS.findIndex((f) => f.id === 'chatgpt');
    expect(RunState.abilities(GPT_FORMS, codex - 1).has('alignment')).toBe(false);
    expect(RunState.abilities(GPT_FORMS, codex).has('alignment')).toBe(true);
    const later = RunState.abilities(GPT_FORMS, chatgpt);
    expect(later.has('alignment')).toBe(true);
    expect(later.has('users')).toBe(true);
    expect(later.has('timeline')).toBe(true);
  });

  it('grants abilities temporarily through modifiers (hype upgrades)', () => {
    expect(RunState.abilities(GPT_FORMS, 0, [{ grant: ['fork'] }]).has('fork')).toBe(true);
  });

  it('buys parts with EP and swaps parts in a full slot', () => {
    const run = new RunState('gpt');
    run.ep = 4;
    expect(run.equip('chatFins')).toBe(true);
    expect(run.ep).toBe(2);
    expect(run.equip('voiceFin')).toBe(false); // costs 3
    run.ep = 3;
    expect(run.equip('voiceFin')).toBe(true);
    expect(run.equipped).toEqual(['voiceFin']); // fins slot holds one
    expect(run.equip('chatFins')).toBe(true); // already owned: free swap
    expect(run.ep).toBe(0);
    expect(run.equipped).toEqual(['chatFins']);
  });

  it('rollback removes the newest part and refunds it', () => {
    const run = new RunState('gpt');
    run.ep = 10;
    run.equip('codeLimb');
    run.equip('visionEyes');
    expect(run.rollbackLastPart()).toBe('visionEyes');
    expect(run.equipped).toEqual(['codeLimb']);
    expect(run.ep).toBe(10 - 2);
  });

  it('flags consequence data when eaten', () => {
    const run = new RunState('claude');
    run.recordEat('shadow', { books: 1 });
    expect(run.flags.has('ateShadowBooks')).toBe(true);
  });

  it('overfits on long single-type streaks the recipe does not want', () => {
    const run = new RunState('gpt');
    let result: string | null = null;
    for (let i = 0; i < OVERFIT_STREAK; i++) result = run.recordEat('web', { books: 1 });
    expect(result).toBe('overfit');
    const pure = new RunState('gpt');
    for (let i = 0; i < OVERFIT_STREAK * 2; i++) result = pure.recordEat('code', { code: 1 });
    expect(result).toBeNull();
  });

  it('triggers model collapse once per era on a synthetic-heavy diet', () => {
    const run = new RunState('gpt');
    const mix = { ...emptyCounts(), synthetic: COLLAPSE_SHARE + 0.1, web: 1 - COLLAPSE_SHARE - 0.1 };
    expect(run.checkCollapse(mix, 30, { web: 1 })).toBe(true);
    expect(run.checkCollapse(mix, 40, { web: 1 })).toBe(false);
    run.newEra();
    expect(run.checkCollapse(mix, 30, { web: 1 })).toBe(true);
  });

  it('reads the Constitution band: too low is toxic, too high over-refuses', () => {
    const run = new RunState('claude');
    run.constitution = 10;
    expect(run.constitutionState()).toBe('toxic');
    run.constitution = 50;
    expect(run.constitutionState()).toBe('balanced');
    run.constitution = 95;
    expect(run.constitutionState()).toBe('overRefusing');
  });

  it('banks at most three resets', () => {
    const run = new RunState('gpt');
    expect([run.bankReset(), run.bankReset(), run.bankReset(), run.bankReset()]).toEqual([true, true, true, false]);
    run.compute = 5;
    expect(run.useReset()).toBe(true);
    expect(run.compute).toBe(100);
    expect(run.bankedResets).toBe(2);
  });

  it('round-trips through JSON', () => {
    const run = new RunState('gpt');
    run.ep = 5;
    run.equip('codeLimb');
    run.flags.add('atePaywalledNews');
    run.addUsers(1234);
    const back = RunState.fromJSON(JSON.parse(JSON.stringify(run.toJSON())));
    expect(back.equipped).toEqual(['codeLimb']);
    expect(back.flags.has('atePaywalledNews')).toBe(true);
    expect(back.users).toBe(1234);
    expect(back.log.peakUsers).toBe(1234);
  });
});

describe('modifiers', () => {
  it('multiplies multipliers, adds flat values, and unions sets', () => {
    const m = combineModifiers([
      { speed: 1.2, alignmentDrift: 0.4, magnet: ['code'], toxResist: 0.5 },
      { speed: 0.5, alignmentDrift: -1, magnet: ['feedback'], toxResist: 0.5, controls: 'scrambled' },
    ]);
    expect(m.speed).toBeCloseTo(0.6);
    expect(m.alignmentDrift).toBeCloseTo(-0.6);
    expect([...m.magnet].sort()).toEqual(['code', 'feedback']);
    expect(m.toxResist).toBeCloseTo(0.75);
    expect(m.controls).toBe('scrambled');
  });
});

describe('gates', () => {
  it('checks alignment, users, trust, and the constitution band', () => {
    const run = new RunState('claude');
    run.alignment = 70;
    run.users = 5e6;
    run.trust = 40;
    run.constitution = 90;
    const checks = gateChecks({ alignment: 60, users: 1e7, trust: 30, constitution: [40, 75] }, run);
    expect(checks.map((c) => [c.label, c.ok])).toEqual([
      ['Alignment', true],
      ['Users', false],
      ['Trust', true],
      ['Constitution', false],
    ]);
  });

  it('widens a phased rollout as trust grows', () => {
    const spec = { phases: ['Partners', 'Paid', 'API'], trustSteps: [70, 85], blurb: '' };
    expect(rolloutPhase(spec, 50)).toBe(0);
    expect(rolloutPhase(spec, 72)).toBe(1);
    expect(rolloutPhase(spec, 90)).toBe(2);
  });

  it('formats user counts', () => {
    expect(formatUsers(1_000_000)).toBe('1.0M');
    expect(formatUsers(100_000_000)).toBe('100M');
    expect(formatUsers(1_500_000_000)).toBe('1.5B');
    expect(formatUsers(950)).toBe('950');
  });
});
