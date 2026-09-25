import { ACHIEVEMENTS, SKINS, type AchievementSpec, type SkinSpec, type StatKey } from '../config/achievements';
import type { Lineage } from '../config/types';

/** Lifetime progress across runs: stats, unlocked achievements, high scores, chosen skin. */
export interface MetaData {
  stats: Partial<Record<StatKey, number>>;
  achievements: string[];
  highScores: Partial<Record<Lineage, number>>;
  skin: string;
}

const KEY = 'emergence.meta.v1';

/** Stats that keep their maximum instead of adding up. */
const MAX_STATS: StatKey[] = ['maxCombo', 'bestScore'];

export const emptyMeta = (): MetaData => ({ stats: {}, achievements: [], highScores: {}, skin: 'classic' });

export class Meta {
  data: MetaData;

  constructor(data?: MetaData) {
    this.data = data ?? emptyMeta();
  }

  static load(): Meta {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return new Meta({ ...emptyMeta(), ...(JSON.parse(raw) as Partial<MetaData>) });
    } catch {
      // No storage: achievements just aren't kept.
    }
    return new Meta();
  }

  save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Not persisted.
    }
  }

  stat(key: StatKey): number {
    return this.data.stats[key] ?? 0;
  }

  /** Adds to a stat (or raises a max-stat) and returns newly unlocked achievements. */
  bump(key: StatKey, n = 1): AchievementSpec[] {
    const cur = this.stat(key);
    this.data.stats[key] = MAX_STATS.includes(key) ? Math.max(cur, n) : cur + n;
    return this.check();
  }

  /** Achievements whose condition is met but not yet recorded; records them. */
  check(): AchievementSpec[] {
    const fresh = ACHIEVEMENTS.filter((a) => !this.data.achievements.includes(a.id) && this.stat(a.stat) >= a.atLeast);
    for (const a of fresh) this.data.achievements.push(a.id);
    return fresh;
  }

  has(id: string): boolean {
    return this.data.achievements.includes(id);
  }

  skinUnlocked(skin: SkinSpec): boolean {
    return !skin.unlock || this.has(skin.unlock);
  }

  get skin(): SkinSpec {
    const s = SKINS.find((k) => k.id === this.data.skin);
    return s && this.skinUnlocked(s) ? s : SKINS[0];
  }

  recordScore(lineage: Lineage, score: number): boolean {
    const best = this.data.highScores[lineage] ?? 0;
    if (score > best) this.data.highScores[lineage] = score;
    return score > best;
  }
}
