import { clearSave, loadSave, type SaveData } from '../save';
import { el } from './dom';

/** Lineage picker + disclaimer. Calls `onStart` with the save to play. */
export function showTitleScreen(parent: HTMLElement, onStart: (save: SaveData) => void): void {
  const screen = el('div', 'title-screen');
  const inner = el('div', 'title-inner');
  inner.append(
    el('h1', undefined, 'EMERGENCE'),
    el('p', 'tagline', 'How AI evolved in the age of large language models'),
    el('p', 'pitch', 'Swim through an ocean of data. Eat what the real models ate. Evolve version by version, and avoid the dangers that nearly derailed the labs.'),
  );

  const choices = el('div', 'lineages');
  const openai = el('button', 'lineage');
  openai.append(el('strong', undefined, 'GPT lineage'), el('span', undefined, 'Start as the Transformer that became GPT-1 (2018)'));
  const claude = el('button', 'lineage');
  claude.disabled = true;
  claude.append(el('strong', undefined, 'Claude lineage'), el('span', undefined, 'Coming soon'));
  choices.append(openai, claude);
  inner.append(choices);

  const existing = loadSave();
  const start = (save: SaveData) => {
    screen.remove();
    onStart(save);
  };
  openai.addEventListener('click', () => {
    clearSave();
    start({ lineage: 'openai', formIndex: 0 });
  });
  if (existing) {
    const resume = el('button', 'btn primary', 'Continue saved game');
    resume.addEventListener('click', () => start(existing));
    inner.append(resume);
  }

  inner.append(
    el(
      'p',
      'disclaimer',
      'An educational fan project. It is not affiliated with or endorsed by OpenAI, Anthropic, Google, Microsoft, or any other organization named. Model names, dates, and training data are presented as historical facts.',
    ),
  );
  screen.append(inner);
  parent.append(screen);
}
