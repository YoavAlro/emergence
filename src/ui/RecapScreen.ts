import type { Recap, RecapRow } from '../game/Recap';
import { el, hex, pct } from './dom';

/** The finale: your run laid over real history. */
export interface RecapPoints {
  score: number;
  best: number;
  newBest: boolean;
  bestCombo: number;
}

export function showRecap(parent: HTMLElement, recap: Recap, opts: { title: string; color: number; onRestart: () => void; points?: RecapPoints }): void {
  const screen = el('div', 'recap-screen');
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-label', 'Run recap');
  const inner = el('div', 'recap-inner');
  const h = el('h1', undefined, opts.title);
  h.style.color = hex(opts.color);
  inner.append(h, el('p', 'recap-headline', recap.headline));
  if (opts.points) {
    const p = opts.points;
    const score = el('div', `recap-score ${p.newBest ? 'new-best' : ''}`);
    score.append(
      el('strong', undefined, p.score.toLocaleString('en-US')),
      el('span', undefined, p.newBest ? 'NEW HIGH SCORE!' : `points · best ${p.best.toLocaleString('en-US')}`),
      el('span', undefined, `Best combo ×${p.bestCombo}`),
    );
    inner.append(score);
  }

  const stats = el('div', 'recap-stats');
  for (const [label, value] of [
    ['Average diet match', pct(recap.score.dietAverage)],
    ['Hype calls right', `${recap.score.hypeCalls[0]} / ${recap.score.hypeCalls[1]}`],
    ['Storms survived', `${recap.score.storms[0]} / ${recap.score.storms[1]}`],
    ['Moments won', `${recap.score.moments[0]} / ${recap.score.moments[1]}`],
    ['Bosses beaten', `${recap.score.bosses[0]} / ${recap.score.bosses[1]}`],
    ['Peak users', recap.peakUsers],
    ['Time played', `${recap.minutes} min`],
  ]) {
    const s = el('div', 'recap-stat');
    s.append(el('strong', undefined, value), el('span', undefined, label));
    stats.append(s);
  }
  inner.append(stats);

  inner.append(section('Your evolution vs real history', recap.timeline, ['When', 'Form', 'Your run', 'Real history']));
  if (recap.hype.length) inner.append(section('Hype or shift? Your calls', recap.hype, ['', 'Hype wave', 'You', 'Verdict']));
  if (recap.storms.length) inner.append(section('Storms', recap.storms, ['', 'Storm', 'You', '']));
  if (recap.consequences.length) {
    const c = el('div', 'recap-section');
    c.append(el('h2', undefined, 'Consequences'));
    const ul = el('ul');
    for (const line of recap.consequences) ul.append(el('li', undefined, line));
    c.append(ul);
    inner.append(c);
  }

  inner.append(
    el('p', 'recap-lesson', 'From "predict the next word" to agent swarms: pre-training, human feedback, tools, reasoning, and agents were the lasting shifts. Many of the loudest moments in between were passing hype.'),
    el('p', 'disclaimer', 'An educational fan project, not affiliated with or endorsed by any organization named. Every fact card lists its sources.'),
  );
  const again = el('button', 'btn primary', 'Play again');
  again.addEventListener('click', () => {
    screen.remove();
    opts.onRestart();
  });
  inner.append(again);
  screen.append(inner);
  parent.append(screen);
  again.focus();
}

function section(title: string, rows: RecapRow[], headers: string[]): HTMLElement {
  const wrap = el('div', 'recap-section');
  wrap.append(el('h2', undefined, title));
  const table = el('table', 'recap-table');
  const head = el('tr');
  for (const hname of headers) head.append(el('th', undefined, hname));
  table.append(head);
  for (const r of rows) {
    const tr = el('tr', r.good === null ? '' : r.good ? 'good' : 'bad');
    for (const v of [r.when, r.title, r.yours, r.real]) tr.append(el('td', undefined, v));
    table.append(tr);
  }
  wrap.append(table);
  return wrap;
}
