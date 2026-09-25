import { describe, expect, it } from 'vitest';
import { OPENAI_FORMS } from '../config/models';
import { ACCURACY_TO_EVOLVE, Progress } from './Progress';

const feed = (p: Progress, type: Parameters<Progress['add']>[0], n: number) => {
  for (let i = 0; i < n; i++) p.add(type);
};

describe('Progress', () => {
  it('evolves Transformer into GPT-1 on a pure books diet', () => {
    const p = new Progress(OPENAI_FORMS);
    feed(p, 'books', 30);
    expect(p.accuracy()).toBe(1);
    expect(p.canEvolve()).toBe(true);
    expect(p.evolve().id).toBe('gpt-1');
    expect(p.eaten).toBe(0);
  });

  it('blocks evolution when the diet does not match history', () => {
    const p = new Progress(OPENAI_FORMS);
    feed(p, 'books', 10);
    feed(p, 'web', 30);
    expect(p.accuracy()).toBeLessThan(ACCURACY_TO_EVOLVE);
    expect(p.canEvolve()).toBe(false);
    expect(p.hint()).toBe('GPT-1 needs more Books');
  });

  it('blocks evolution below the data target', () => {
    const p = new Progress(OPENAI_FORMS);
    feed(p, 'books', 29);
    expect(p.canEvolve()).toBe(false);
  });

  it('loseAny takes from the largest pile first', () => {
    const p = new Progress(OPENAI_FORMS);
    feed(p, 'books', 5);
    feed(p, 'web', 2);
    p.loseAny(3);
    expect(p.counts.books).toBe(2);
    expect(p.counts.web).toBe(2);
  });

  it('has no next form past the last playable model', () => {
    const lastPlayable = OPENAI_FORMS.findLastIndex((f) => f.playable);
    const p = new Progress(OPENAI_FORMS, lastPlayable);
    expect(p.next).toBeUndefined();
    expect(p.canEvolve()).toBe(false);
  });
});
