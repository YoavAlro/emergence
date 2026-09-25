import { POWER_UPS, POWER_UP_EVERY, type PowerUpId, type PowerUpSpec } from '../config/powerups';

/** Active power-up timers and the spawn clock. Pure logic. */
export class PowerUps {
  private readonly left = new Map<PowerUpId, number>();
  private untilSpawn: number;

  constructor(private readonly rand: () => number = Math.random) {
    this.untilSpawn = this.nextGap();
  }

  private nextGap(): number {
    const [a, b] = POWER_UP_EVERY;
    return a + (b - a) * this.rand();
  }

  has(id: PowerUpId): boolean {
    return (this.left.get(id) ?? 0) > 0;
  }

  /** Seconds left, 0 if inactive. */
  timeLeft(id: PowerUpId): number {
    return Math.max(0, this.left.get(id) ?? 0);
  }

  grant(id: PowerUpId): PowerUpSpec {
    const spec = POWER_UPS.find((p) => p.id === id)!;
    this.left.set(id, spec.seconds);
    return spec;
  }

  /** The shield absorbs a hit. Returns true if it did. */
  absorbHit(): boolean {
    if (!this.has('shield')) return false;
    this.left.delete('shield');
    return true;
  }

  active(): { spec: PowerUpSpec; left: number }[] {
    return POWER_UPS.filter((p) => this.has(p.id)).map((spec) => ({ spec, left: this.timeLeft(spec.id) }));
  }

  /** Ticks timers; returns a power-up to spawn in the world when it's time. */
  update(dt: number): PowerUpSpec | null {
    for (const [id, t] of this.left) {
      if (t - dt <= 0) this.left.delete(id);
      else this.left.set(id, t - dt);
    }
    this.untilSpawn -= dt;
    if (this.untilSpawn > 0) return null;
    this.untilSpawn = this.nextGap();
    return pickWeighted(POWER_UPS, this.rand());
  }
}

export function pickWeighted(list: PowerUpSpec[], r: number): PowerUpSpec {
  const total = list.reduce((s, p) => s + p.weight, 0);
  let x = r * total;
  for (const p of list) {
    x -= p.weight;
    if (x < 0) return p;
  }
  return list[list.length - 1];
}
