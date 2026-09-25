import { describe, expect, it } from 'vitest';
import type { EventSpec, RecurringGag } from '../config/types';
import { EVENT_GAP, EventDirector, GagTimer, type DirectorCtx } from './EventDirector';

const ctx = (over: Partial<DirectorCtx> = {}): DirectorCtx => ({
  dietReady: false,
  still: false,
  slow: false,
  nearBeacon: false,
  toxicity: 0,
  alignment: 50,
  trust: 50,
  rogues: 0,
  ...over,
});

const fact = { title: 't', date: 'd', lines: ['l'], sources: [{ label: 's', url: 'https://example.com' }] };

const ev = (id: string, over: Partial<EventSpec> = {}): EventSpec => ({
  id,
  kind: 'storm',
  at: { gpt: 'chatgpt' },
  delaySec: 10,
  durationSec: 30,
  title: id,
  banner: '',
  objective: { kind: 'survive' },
  fact,
  ...over,
});

/** Runs the director until the active event ends; returns its success. */
function runToEnd(d: EventDirector, c: DirectorCtx, signals: (d: EventDirector, t: number) => void = () => {}): boolean | null {
  for (let t = 0; t < 300; t += 0.5) {
    signals(d, t);
    for (const e of d.update(0.5, c)) if (e.type === 'end') return e.success;
  }
  return null;
}

describe('EventDirector', () => {
  it('schedules only the events for this era and lineage, in delay order', () => {
    const events = [
      ev('late', { delaySec: 50 }),
      ev('early', { delaySec: 5 }),
      ev('other-era', { at: { gpt: 'gpt-4' } }),
      ev('claude-only', { at: { claude: 'chatgpt' } }),
    ];
    expect(EventDirector.eventsFor(events, 'gpt', 'chatgpt', new Set()).map((e) => e.id)).toEqual(['early', 'late']);
  });

  it('fires consequence events only when the flag was set earlier', () => {
    const events = [ev('lawsuit', { requiresFlag: 'ateShadowBooks' })];
    expect(EventDirector.eventsFor(events, 'gpt', 'chatgpt', new Set())).toHaveLength(0);
    expect(EventDirector.eventsFor(events, 'gpt', 'chatgpt', new Set(['ateShadowBooks']))).toHaveLength(1);
  });

  it('waits for the delay, then starts the event, and blocks evolution until it ends', () => {
    const d = new EventDirector([ev('a', { delaySec: 20, durationSec: 10 })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    expect(d.eraClear).toBe(false);
    expect(d.update(10, ctx())).toEqual([]);
    const started = d.update(11, ctx());
    expect(started[0]?.type).toBe('start');
    expect(d.eraClear).toBe(false);
    const ended = d.update(10.5, ctx());
    expect(ended[0]).toMatchObject({ type: 'end', success: true });
    expect(d.eraClear).toBe(true);
  });

  it('hurries pending events once the diet is ready, with a short gap', () => {
    const d = new EventDirector([ev('a', { delaySec: 500 })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    expect(d.update(1, ctx({ dietReady: true }))[0]?.type).toBe('start');
  });

  it('keeps a calm gap between events', () => {
    const d = new EventDirector([ev('a', { delaySec: 0, durationSec: 1 }), ev('b', { delaySec: 0, durationSec: 1 })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    d.update(0.1, ctx()); // starts a
    d.update(1, ctx()); // ends a
    expect(d.update(EVENT_GAP / 2, ctx())).toEqual([]);
    expect(d.update(EVENT_GAP, ctx())[0]).toMatchObject({ type: 'start' });
  });

  it('does not replay events that were already done (saved games)', () => {
    const d = new EventDirector([ev('a')]);
    d.done.add('a');
    d.enterEra('gpt', 'chatgpt', new Set());
    expect(d.eraClear).toBe(true);
  });

  it('scores collect objectives and ends early when they allow it', () => {
    const d = new EventDirector([ev('hearts', { delaySec: 0, objective: { kind: 'collect', count: 3, endsEarly: true } })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    const result = runToEnd(d, ctx(), (dir, t) => t > 1 && t < 3 && dir.signal('collect'));
    expect(result).toBe(true);
  });

  it('fails avoid-hits objectives after too many hits', () => {
    const d = new EventDirector([ev('sharks', { delaySec: 0, objective: { kind: 'avoidHits', max: 1 } })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    expect(runToEnd(d, ctx(), (dir, t) => t > 1 && t < 3 && dir.signal('hit'))).toBe(false);
  });

  it('scores stay-near objectives by time near a beacon', () => {
    const near = new EventDirector([ev('gpu', { delaySec: 0, durationSec: 20, objective: { kind: 'stayNear', fraction: 0.5 } })]);
    near.enterEra('gpt', 'chatgpt', new Set());
    expect(runToEnd(near, ctx({ nearBeacon: true }))).toBe(true);
    const far = new EventDirector([ev('gpu', { delaySec: 0, durationSec: 20, objective: { kind: 'stayNear', fraction: 0.5 } })]);
    far.enterEra('gpt', 'chatgpt', new Set());
    expect(runToEnd(far, ctx())).toBe(false);
  });

  it('fails keep-above objectives when the meter dips', () => {
    const d = new EventDirector([ev('sydney', { delaySec: 0, objective: { kind: 'keepAbove', meter: 'alignment', value: 35 } })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    expect(runToEnd(d, ctx({ alignment: 20 }))).toBe(false);
  });

  it('ends a swarm storm as soon as no rogue forks remain', () => {
    const d = new EventDirector([ev('leak', { delaySec: 0, durationSec: 60, objective: { kind: 'noRogues' } })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    d.update(0.1, ctx({ rogues: 3 }));
    expect(d.update(5, ctx({ rogues: 3 }))).toEqual([]);
    expect(d.update(1, ctx({ rogues: 0 }))[0]).toMatchObject({ type: 'end', success: true });
  });

  it('waits for mini-games to report a result', () => {
    const d = new EventDirector([ev('chart', { delaySec: 0, durationSec: 5, objective: { kind: 'minigame' } })]);
    d.enterEra('gpt', 'chatgpt', new Set());
    d.update(0.1, ctx());
    expect(d.update(100, ctx())).toEqual([]);
    d.resolveMinigame(false);
    expect(d.update(0.1, ctx())[0]).toMatchObject({ type: 'end', success: false });
  });
});

describe('GagTimer', () => {
  const gag: RecurringGag = {
    id: 'reset',
    lineage: 'gpt',
    fromForm: 'x',
    everySec: [10, 10],
    lowComputeBoost: 3,
    pickup: { label: 'Reset', color: 0, shape: 'button', effect: {} },
    globalChance: 0.5,
    globalToast: '',
    bankCap: 3,
    fact,
  };

  it('spawns more often when compute is low', () => {
    const full = new GagTimer(gag, () => 0.9);
    expect(full.update(5, 1)).toBeNull();
    const empty = new GagTimer(gag, () => 0.9);
    expect(empty.update(5, 0)).toBe('spawn'); // 5s × (1 + 3) ≥ 10s
  });

  it('sometimes fires for everyone instead', () => {
    const t = new GagTimer(gag, () => 0.1);
    expect(t.update(20, 1)).toBe('global');
  });
});
