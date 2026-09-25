import type { ModelForm } from '../config/types';
import { formatUsers, type RunLog } from './RunState';

export interface RecapRow {
  when: string;
  title: string;
  yours: string;
  real: string;
  good: boolean | null;
}

export interface Recap {
  headline: string;
  score: { dietAverage: number; hypeCalls: [number, number]; storms: [number, number]; moments: [number, number] };
  timeline: RecapRow[];
  hype: RecapRow[];
  storms: RecapRow[];
  consequences: string[];
  minutes: number;
  peakUsers: string;
}

/** Compares a finished run with real history. Pure: the recap screen just renders it. */
export function buildRecap(forms: ModelForm[], log: RunLog): Recap {
  const timeline: RecapRow[] = log.forms.map((rec) => {
    const form = forms.find((f) => f.id === rec.id);
    return {
      when: form?.fact.date.split(' · ')[0] ?? '',
      title: rec.name,
      yours: `Diet match ${Math.round(rec.accuracy * 100)}%${rec.users > 0 ? ` · ${formatUsers(rec.users)} users` : ''}`,
      real: form?.history ?? form?.fact.lines[0] ?? '',
      good: rec.accuracy >= 0.8,
    };
  });

  const hype: RecapRow[] = log.bets.map((b) => {
    const called = b.guess === b.verdict;
    const betText = b.bet ? 'You bet on it' : 'You sat it out';
    const guessText = b.guess ? `you called it ${b.guess === 'lasting' ? 'a lasting shift' : 'passing hype'}` : 'no call';
    return {
      when: '',
      title: b.title,
      yours: `${betText}; ${guessText}`,
      real: b.verdict === 'lasting' ? 'Lasting shift' : 'Passing hype',
      good: b.guess ? called : null,
    };
  });

  const storms: RecapRow[] = log.storms.map((s) => ({
    when: '',
    title: s.title,
    yours: s.survived ? 'Survived' : 'Took the hit',
    real: '',
    good: s.survived,
  }));

  const calls = log.bets.filter((b) => b.guess);
  const hypeCalls: [number, number] = [calls.filter((b) => b.guess === b.verdict).length, log.bets.length];
  const survived = log.storms.filter((s) => s.survived).length;
  const momentsWon = log.moments.filter((m) => m.won).length;
  const dietAverage = log.forms.length ? log.forms.reduce((s, f) => s + f.accuracy, 0) / log.forms.length : 0;

  const headline =
    dietAverage >= 0.85 && hypeCalls[0] >= hypeCalls[1] * 0.7
      ? 'You retraced history closely, and you could tell hype from real shifts.'
      : dietAverage >= 0.75
        ? 'Your training was close to the real recipes. Some hype got the better of you.'
        : 'You took your own path to the frontier. History did it a little differently.';

  return {
    headline,
    score: { dietAverage, hypeCalls, storms: [survived, log.storms.length], moments: [momentsWon, log.moments.length] },
    timeline,
    hype,
    storms,
    consequences: log.consequences,
    minutes: Math.round(log.playSeconds / 60),
    peakUsers: formatUsers(log.peakUsers),
  };
}
