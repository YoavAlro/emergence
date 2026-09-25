/** Score and combos. Pure logic; the HUD shows it and the Game feeds it. */

export const COMBO_WINDOW = 1.8;
export const BASE_POINTS = 10;
/** Eating data the recipe doesn't want still scores, just less. */
export const OFF_DIET_FACTOR = 0.3;

export const COMBO_CALLOUTS: [number, string][] = [
  [10, 'Nice streak!'],
  [25, 'On a roll!'],
  [50, 'Scaling law!'],
  [100, 'EMERGENT BEHAVIOR!'],
];

export interface EatResult {
  points: number;
  combo: number;
  multiplier: number;
  callout: string | null;
}

export class Score {
  total = 0;
  combo = 0;
  bestCombo = 0;
  private lastEat = -Infinity;

  /** ×1 at the start, +0.5 every 8 in a row, up to ×5. */
  multiplier(): number {
    return Math.min(5, 1 + Math.floor(this.combo / 8) * 0.5);
  }

  /** `onDiet`: the recipe wants this type. Returns what to show. */
  eat(t: number, onDiet: boolean): EatResult {
    if (t - this.lastEat > COMBO_WINDOW) this.combo = 0;
    this.lastEat = t;
    const before = this.combo;
    if (onDiet) this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const multiplier = this.multiplier();
    const points = Math.round(BASE_POINTS * (onDiet ? 1 : OFF_DIET_FACTOR) * multiplier);
    this.total += points;
    const callout = COMBO_CALLOUTS.find(([n]) => before < n && this.combo >= n)?.[1] ?? null;
    return { points, combo: this.combo, multiplier, callout };
  }

  /** Something bad happened: the combo breaks. Returns the combo that was lost. */
  break(): number {
    const lost = this.combo;
    this.combo = 0;
    return lost;
  }

  /** Is the combo still alive at time t? */
  alive(t: number): boolean {
    return this.combo > 0 && t - this.lastEat <= COMBO_WINDOW;
  }

  bonus(points: number): number {
    const p = Math.round(points);
    this.total += p;
    return p;
  }
}
