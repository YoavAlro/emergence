import { describe, expect, it } from 'vitest';
import { GPT_FORMS } from '../config/gptForms';
import { buildRecap } from './Recap';
import { RunState } from './RunState';

describe('buildRecap', () => {
  it('compares diet, hype calls, and storms with history', () => {
    const run = new RunState('gpt');
    run.log.forms.push({ id: 'gpt-1', name: 'GPT-1', accuracy: 0.9, mix: { books: 0.9 }, users: 0, seconds: 120 });
    run.log.forms.push({ id: 'gpt-2', name: 'GPT-2', accuracy: 0.7, mix: { web: 0.7 }, users: 0, seconds: 120 });
    run.log.bets.push({ eventId: 'mcp', title: 'MCP', bet: true, guess: 'lasting', verdict: 'lasting' });
    run.log.bets.push({ eventId: 'gadgets', title: 'AI gadgets', bet: true, guess: 'lasting', verdict: 'passing' });
    run.log.storms.push({ id: 'italy', title: 'Italy', survived: true }, { id: 'nyt', title: 'NYT', survived: false });
    run.log.consequences.push('Sharks doubled.');
    run.log.playSeconds = 3900;
    const r = buildRecap(GPT_FORMS, run.log);
    expect(r.score.dietAverage).toBeCloseTo(0.8);
    expect(r.score.hypeCalls).toEqual([1, 2]);
    expect(r.score.storms).toEqual([1, 2]);
    expect(r.timeline[0].real).toContain('7,000 books');
    expect(r.hype[1]).toMatchObject({ good: false, real: 'Passing hype' });
    expect(r.consequences).toEqual(['Sharks doubled.']);
    expect(r.minutes).toBe(65);
  });
});
