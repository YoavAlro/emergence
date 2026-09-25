import type { EventSpec, Lineage, RecurringGag } from '../config/types';

/** What the world looks like this tick, as far as objectives care. */
export interface DirectorCtx {
  /** The data target and diet are met: pending events fire sooner so nobody waits. */
  dietReady: boolean;
  still: boolean;
  slow: boolean;
  nearBeacon: boolean;
  toxicity: number;
  alignment: number;
  trust: number;
  rogues: number;
}

export interface ActiveEvent {
  spec: EventSpec;
  elapsed: number;
  timeLeft: number;
  collected: number;
  hits: number;
  eaten: number;
  badPickups: number;
  goodTime: number;
  failed: boolean;
  minigameResult: boolean | null;
}

export type DirectorEvent =
  | { type: 'start'; active: ActiveEvent }
  | { type: 'end'; active: ActiveEvent; success: boolean };

/** Seconds of calm between events. */
export const EVENT_GAP = 8;
export const EVENT_GAP_HURRY = 3;

/**
 * Schedules each era's hypes, storms, and moments, and scores their objectives.
 * Pure logic: the Game reads the returned events and runs the effects.
 */
export class EventDirector {
  private queue: EventSpec[] = [];
  active: ActiveEvent | null = null;
  private eraTime = 0;
  private sinceLast = EVENT_GAP;
  /** Ids already fired this run (saved so a reload doesn't repeat them). */
  readonly done = new Set<string>();

  constructor(private readonly events: EventSpec[]) {}

  /** Events that fire in this form's era, for this lineage, given past choices. */
  static eventsFor(events: EventSpec[], lineage: Lineage, formId: string, flags: Set<string>): EventSpec[] {
    return events
      .filter((e) => e.at[lineage] === formId)
      .filter((e) => !e.requiresFlag || flags.has(e.requiresFlag))
      .sort((a, b) => a.delaySec - b.delaySec);
  }

  enterEra(lineage: Lineage, formId: string, flags: Set<string>): void {
    this.queue = EventDirector.eventsFor(this.events, lineage, formId, flags).filter((e) => !this.done.has(e.id));
    this.eraTime = 0;
    this.sinceLast = EVENT_GAP;
  }

  /** No events left to play in this era: evolution may proceed. */
  get eraClear(): boolean {
    return this.queue.length === 0 && !this.active;
  }

  /** Puts an event at the front of the queue (debug and tests). */
  inject(spec: EventSpec): void {
    this.queue.unshift(spec);
    this.sinceLast = EVENT_GAP;
  }

  get pending(): readonly EventSpec[] {
    return this.queue;
  }

  update(dt: number, ctx: DirectorCtx): DirectorEvent[] {
    const out: DirectorEvent[] = [];
    this.eraTime += dt;

    if (this.active) {
      const a = this.active;
      if (a.spec.objective?.kind === 'minigame') {
        if (a.minigameResult !== null) out.push(this.finish(a.minigameResult));
        return out;
      }
      a.elapsed += dt;
      a.timeLeft -= dt;
      this.track(a, dt, ctx);
      const early = this.earlyResult(a, ctx);
      if (early !== null) out.push(this.finish(early));
      else if (a.timeLeft <= 0) out.push(this.finish(this.finalResult(a)));
      return out;
    }

    this.sinceLast += dt;
    const next = this.queue[0];
    if (!next) return out;
    const gap = ctx.dietReady ? EVENT_GAP_HURRY : EVENT_GAP;
    if (this.sinceLast >= gap && (this.eraTime >= next.delaySec || ctx.dietReady)) {
      this.queue.shift();
      this.done.add(next.id);
      this.active = {
        spec: next,
        elapsed: 0,
        timeLeft: next.durationSec,
        collected: 0,
        hits: 0,
        eaten: 0,
        badPickups: 0,
        goodTime: 0,
        failed: false,
        minigameResult: null,
      };
      out.push({ type: 'start', active: this.active });
    }
    return out;
  }

  /** Something happened that objectives count. */
  signal(kind: 'collect' | 'hit' | 'eat' | 'badPickup', n = 1): void {
    const a = this.active;
    if (!a) return;
    if (kind === 'collect') a.collected += n;
    else if (kind === 'hit') a.hits += n;
    else if (kind === 'eat') a.eaten += n;
    else a.badPickups += n;
  }

  resolveMinigame(success: boolean): void {
    if (this.active) this.active.minigameResult = success;
  }

  /** Ends the active event now (e.g. a debug skip). */
  forceEnd(success: boolean): DirectorEvent | null {
    return this.active ? this.finish(success) : null;
  }

  /** Progress toward the objective, 0..1, for the HUD. */
  progress(): number {
    const a = this.active;
    const o = a?.spec.objective;
    if (!a || !o) return 0;
    switch (o.kind) {
      case 'collect':
        return Math.min(1, a.collected / o.count);
      case 'eat':
        return Math.min(1, a.eaten / o.count);
      case 'stayNear':
      case 'holdStill':
      case 'slowDown':
        return Math.min(1, a.goodTime / (o.fraction * a.spec.durationSec));
      case 'avoidHits':
        return Math.max(0, 1 - a.hits / (o.max + 1));
      case 'avoidPickups':
        return Math.max(0, 1 - a.badPickups / (o.max + 1));
      default:
        return a.failed ? 0 : 1;
    }
  }

  private track(a: ActiveEvent, dt: number, ctx: DirectorCtx): void {
    const o = a.spec.objective;
    if (!o) return;
    if (o.kind === 'stayNear' && ctx.nearBeacon) a.goodTime += dt;
    if (o.kind === 'holdStill' && ctx.still) a.goodTime += dt;
    if (o.kind === 'slowDown' && ctx.slow) a.goodTime += dt;
    if (o.kind === 'keepBelow' && ctx.toxicity > o.value) a.failed = true;
    if (o.kind === 'keepAbove' && ctx[o.meter] < o.value) a.failed = true;
    if (o.kind === 'avoidHits' && a.hits > o.max) a.failed = true;
    if (o.kind === 'avoidPickups' && a.badPickups > o.max) a.failed = true;
  }

  private earlyResult(a: ActiveEvent, ctx: DirectorCtx): boolean | null {
    const o = a.spec.objective;
    if (!o) return null;
    if (o.kind === 'collect' && o.endsEarly && a.collected >= o.count) return true;
    if (o.kind === 'eat' && o.endsEarly && a.eaten >= o.count) return true;
    if (o.kind === 'noRogues' && a.elapsed > 3 && ctx.rogues === 0) return true;
    return null;
  }

  private finalResult(a: ActiveEvent): boolean {
    const o = a.spec.objective;
    if (!o) return true;
    switch (o.kind) {
      case 'survive':
        return true;
      case 'collect':
        return a.collected >= o.count;
      case 'eat':
        return a.eaten >= o.count;
      case 'stayNear':
      case 'holdStill':
      case 'slowDown':
        return a.goodTime >= o.fraction * a.spec.durationSec;
      case 'noRogues':
        return false;
      default:
        return !a.failed;
    }
  }

  private finish(success: boolean): DirectorEvent {
    const active = this.active!;
    this.active = null;
    this.sinceLast = 0;
    return { type: 'end', active, success };
  }
}

/** The recurring gag timer (e.g. the reset orb): spawns more often when compute is low. */
export class GagTimer {
  private wait: number;

  constructor(
    readonly gag: RecurringGag,
    private readonly rng: () => number = Math.random,
  ) {
    this.wait = this.roll();
  }

  /** `computeFraction` is 0..1. Returns what happens this tick, if anything. */
  update(dt: number, computeFraction: number): 'spawn' | 'global' | null {
    const speedup = 1 + this.gag.lowComputeBoost * (1 - computeFraction);
    this.wait -= dt * speedup;
    if (this.wait > 0) return null;
    this.wait = this.roll();
    return this.rng() < this.gag.globalChance ? 'global' : 'spawn';
  }

  private roll(): number {
    const [lo, hi] = this.gag.everySec;
    return lo + (hi - lo) * this.rng();
  }
}
