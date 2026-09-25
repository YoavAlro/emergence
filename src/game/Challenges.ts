import { CHALLENGES, CHALLENGE_GAP, type ChallengeSpec } from '../config/challenges';
import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';

export interface ActiveChallenge {
  spec: ChallengeSpec;
  text: string;
  type: DataTypeId | null;
  left: number;
  progress: number;
  target: number;
  failed: boolean;
}

export type ChallengeEvent = { type: 'start'; c: ActiveChallenge } | { type: 'end'; c: ActiveChallenge; won: boolean };

/**
 * Quick side challenges between events. Pure logic: the Game feeds signals
 * (eat, combo, hit, power-up) and shows the results.
 */
export class Challenges {
  active: ActiveChallenge | null = null;
  private calm = 0;
  private last = '';

  constructor(private readonly rand: () => number = Math.random) {}

  /** `busy`: an event is running, so no new challenge starts (a running one continues). */
  update(dt: number, busy: boolean, stage: number, wanted: DataTypeId | null): ChallengeEvent[] {
    const out: ChallengeEvent[] = [];
    const a = this.active;
    if (a) {
      a.left -= dt;
      if (a.failed) {
        out.push(this.finish(false));
        return out;
      }
      if (a.spec.goal.kind === 'noHit') a.progress = Math.min(a.target, a.spec.seconds - a.left);
      if (a.progress >= a.target) out.push(this.finish(true));
      else if (a.left <= 0) out.push(this.finish(a.spec.goal.kind === 'noHit'));
      return out;
    }
    if (busy) {
      this.calm = 0;
      return out;
    }
    this.calm += dt;
    if (this.calm < CHALLENGE_GAP) return out;
    this.calm = 0;
    const pool = CHALLENGES.filter((c) => (c.fromStage ?? 1) <= stage && c.id !== this.last && (c.goal.kind !== 'eatType' || wanted));
    if (!pool.length) return out;
    const spec = pool[Math.floor(this.rand() * pool.length)];
    this.last = spec.id;
    const type = spec.goal.kind === 'eatType' ? wanted : null;
    const g = spec.goal;
    const target = g.kind === 'noHit' ? spec.seconds : g.kind === 'powerUp' ? 1 : g.count;
    const label = type ? DATA_TYPES[type].label : '';
    this.active = { spec, text: spec.text.replace('{type}', label), type, left: spec.seconds, progress: 0, target, failed: false };
    out.push({ type: 'start', c: this.active });
    return out;
  }

  private finish(won: boolean): ChallengeEvent {
    const c = this.active!;
    this.active = null;
    this.calm = 0;
    return { type: 'end', c, won };
  }

  eat(kind: DataTypeId, bucket: DataTypeId): void {
    const a = this.active;
    if (!a) return;
    if (a.spec.goal.kind === 'eatAny') a.progress++;
    if (a.spec.goal.kind === 'eatType' && (kind === a.type || bucket === a.type)) a.progress++;
  }

  combo(n: number): void {
    const a = this.active;
    if (a?.spec.goal.kind === 'combo') a.progress = Math.max(a.progress, n);
  }

  /** A hit ends a no-hit challenge (it resolves on the next update). */
  hit(): void {
    const a = this.active;
    if (a?.spec.goal.kind === 'noHit') a.failed = true;
  }

  powerUp(): void {
    const a = this.active;
    if (a?.spec.goal.kind === 'powerUp') a.progress = 1;
  }
}
