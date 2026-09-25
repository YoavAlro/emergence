import { describe, expect, it } from 'vitest';
import { GPT_FORMS } from '../config/gptForms';
import { ACCURACY_TO_EVOLVE, Progress } from './Progress';

const feed = (p: Progress, type: Parameters<Progress['add']>[0], n: number) => {
  for (let i = 0; i < n; i++) p.add(type);
};

describe('Progress', () => {
  it('evolves Transformer into GPT-1 on a pure books diet', () => {
    const p = new Progress(GPT_FORMS);
    feed(p, 'books', 30);
    expect(p.accuracy()).toBe(1);
    expect(p.dietReady()).toBe(true);
    expect(p.evolve().id).toBe('gpt-1');
    expect(p.eaten).toBe(0);
  });

  it('blocks evolution when the diet does not match history', () => {
    const p = new Progress(GPT_FORMS);
    feed(p, 'books', 10);
    feed(p, 'web', 30);
    expect(p.accuracy()).toBeLessThan(ACCURACY_TO_EVOLVE);
    expect(p.dietReady()).toBe(false);
    expect(p.hint()).toBe('GPT-1 needs more Books');
  });

  it('blocks evolution below the data target', () => {
    const p = new Progress(GPT_FORMS);
    feed(p, 'books', 29);
    expect(p.dietReady()).toBe(false);
  });

  it('counts pirated books toward Books (they still match the recipe)', () => {
    const p = new Progress(GPT_FORMS);
    feed(p, 'shadow', 30);
    expect(p.counts.books).toBe(30);
    expect(p.accuracy()).toBe(1);
  });

  it('loseAny takes from the largest pile first', () => {
    const p = new Progress(GPT_FORMS);
    feed(p, 'books', 5);
    feed(p, 'web', 2);
    p.loseAny(3);
    expect(p.counts.books).toBe(2);
    expect(p.counts.web).toBe(2);
  });

  it('has no next form at the finale', () => {
    const p = new Progress(GPT_FORMS, GPT_FORMS.length - 1);
    expect(p.next).toBeUndefined();
    expect(p.dietReady()).toBe(false);
  });
});
