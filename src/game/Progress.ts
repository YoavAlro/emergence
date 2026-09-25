import { DATA_TYPES, DATA_TYPE_IDS, bucketOf, type DataTypeId } from '../config/dataTypes';
import type { ModelForm } from '../config/types';

/** How closely your diet must match the real training mix to evolve. */
export const ACCURACY_TO_EVOLVE = 0.65;

export type Counts = Record<DataTypeId, number>;

export const emptyCounts = (): Counts =>
  Object.fromEntries(DATA_TYPE_IDS.map((id) => [id, 0])) as Counts;

/** Tracks what the player ate toward the next model and whether the diet is ready. */
export class Progress {
  counts: Counts = emptyCounts();

  constructor(
    readonly forms: ModelForm[],
    public formIndex = 0,
  ) {}

  get current(): ModelForm {
    return this.forms[this.formIndex];
  }

  /** The next form, or undefined at the finale. */
  get next(): ModelForm | undefined {
    return this.forms[this.formIndex + 1];
  }

  get eaten(): number {
    return DATA_TYPE_IDS.reduce((sum, id) => sum + this.counts[id], 0);
  }

  /** Adds `n` pieces, counted toward the type's diet bucket (pirated books count as Books). */
  add(type: DataTypeId, n = 1): void {
    this.counts[bucketOf(type)] += n;
  }

  loseFraction(fraction: number): void {
    for (const id of DATA_TYPE_IDS) this.counts[id] = Math.floor(this.counts[id] * (1 - fraction));
  }

  /** Removes `n` pieces, taking from whatever the player has most of. */
  loseAny(n: number): void {
    for (let i = 0; i < n; i++) {
      const top = DATA_TYPE_IDS.reduce((a, b) => (this.counts[b] > this.counts[a] ? b : a));
      if (this.counts[top] === 0) return;
      this.counts[top]--;
    }
  }

  loseType(type: DataTypeId, n: number): void {
    const id = bucketOf(type);
    this.counts[id] = Math.max(0, this.counts[id] - n);
  }

  mix(): Counts {
    const total = this.eaten;
    const shares = emptyCounts();
    if (total === 0) return shares;
    for (const id of DATA_TYPE_IDS) shares[id] = this.counts[id] / total;
    return shares;
  }

  /** 1 = your diet matches the real training mix exactly, 0 = no overlap. */
  accuracy(): number {
    const next = this.next;
    if (!next || this.eaten === 0) return 0;
    const mix = this.mix();
    const distance = DATA_TYPE_IDS.reduce(
      (sum, id) => sum + Math.abs(mix[id] - (next.recipe[id] ?? 0)),
      0,
    );
    return 1 - distance / 2;
  }

  /** The data target is met and the diet matches history (gates are checked separately). */
  dietReady(): boolean {
    const next = this.next;
    return !!next && this.eaten >= next.target && this.accuracy() >= ACCURACY_TO_EVOLVE;
  }

  /** Advice on the biggest gap between your diet and the real one. */
  hint(): string | null {
    const next = this.next;
    if (!next || this.eaten === 0) return null;
    const mix = this.mix();
    const gaps = DATA_TYPE_IDS.map((id) => ({ id, gap: (next.recipe[id] ?? 0) - mix[id] }));
    const deficit = gaps.reduce((a, b) => (b.gap > a.gap ? b : a));
    const surplus = gaps.reduce((a, b) => (b.gap < a.gap ? b : a));
    if (deficit.gap < 0.05 && surplus.gap > -0.05) return null;
    return deficit.gap >= -surplus.gap
      ? `${next.name} needs more ${DATA_TYPES[deficit.id].label}`
      : `Too much ${DATA_TYPES[surplus.id].label} for ${next.name}`;
  }

  evolve(): ModelForm {
    this.formIndex++;
    this.counts = emptyCounts();
    return this.current;
  }
}
