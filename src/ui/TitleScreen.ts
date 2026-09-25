import { LINEAGES } from '../config/models';
import type { Lineage } from '../config/types';
import { clearSave, loadSave, type SaveData } from '../save';
import { el } from './dom';

/** Lineage picker + disclaimer. Calls `onStart` with the save to play. */
export function showTitleScreen(parent: HTMLElement, onStart: (save: SaveData) => void): void {
  const screen = el('div', 'title-screen');
  const inner = el('main', 'title-inner');
  inner.append(
    el('h1', undefined, 'EMERGENCE'),
    el('p', 'tagline', 'How AI evolved in the age of large language models'),
    el('p', 'pitch', 'Swim through an ocean of data. Eat what the real models ate. Evolve version by version, ride the hype, and survive the storms that nearly derailed the labs.'),
  );

  const start = (save: SaveData) => {
    screen.remove();
    onStart(save);
  };
  const choices = el('div', 'lineages');
  for (const id of ['gpt', 'claude'] as Lineage[]) {
    const info = LINEAGES[id];
    const btn = el('button', `lineage ${id}`);
    btn.dataset.lineage = id;
    const ready = info.forms.length > 1;
    btn.disabled = !ready;
    btn.append(el('strong', undefined, info.name), el('span', undefined, ready ? info.blurb : 'Coming soon'));
    btn.addEventListener('click', () => {
      clearSave();
      start({ lineage: id, formIndex: 0 });
    });
    choices.append(btn);
  }
  inner.append(choices);

  const existing = loadSave();
  if (existing && LINEAGES[existing.lineage].forms.length > existing.formIndex) {
    const form = LINEAGES[existing.lineage].forms[existing.formIndex];
    const resume = el('button', 'btn primary', `Continue: ${form.name}`);
    resume.addEventListener('click', () => start(existing));
    inner.append(resume);
  }

  inner.append(
    el('p', 'controls-note', 'Desktop: WASD to swim, drag to look, Shift to boost. Touch: left thumb to swim, right thumb to look, on-screen buttons for everything else.'),
    el(
      'p',
      'disclaimer',
      'An educational fan project. It is not affiliated with or endorsed by OpenAI, Anthropic, Google, Microsoft, Meta, xAI, or any other organization named. No logos are used. Model names, dates, and training data are presented as historical facts, and every fact card lists its sources.',
    ),
  );
  screen.append(inner);
  parent.append(screen);
}
