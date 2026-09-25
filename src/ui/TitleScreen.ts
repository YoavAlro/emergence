import { HERO_STYLE, LINEAGE_LAB, labFor } from '../config/labs';
import { LINEAGES } from '../config/models';
import type { Lineage } from '../config/types';
import { Meta } from '../game/Meta';
import { clearSave, loadSave, type SaveData } from '../save';
import { el, hex } from './dom';
import { emblemCanvas } from './doodle';
import { showTrophies, skinPreview } from './Trophies';

/** Lineage picker + disclaimer. Calls `onStart` with the save to play. */
export function showTitleScreen(parent: HTMLElement, onStart: (save: SaveData) => void): void {
  const screen = el('div', 'title-screen');
  const inner = el('main', 'title-inner');
  inner.append(
    el('h1', undefined, 'EMERGENCE'),
    el('p', 'tagline', 'How AI evolved in the age of large language models'),
    el('p', 'pitch', 'Swim through an ocean of data. Eat what the real models ate. Chain combos, bonk rival-lab bosses, ride the hype, and survive the storms that nearly derailed the labs.'),
  );
  const meta = Meta.load();

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
    const lab = labFor(LINEAGE_LAB[id]);
    // Your hero for this lineage, with its lab's emblem as a sticker.
    const art = el('div', 'lineage-art');
    const hero = skinPreview(meta.skin, 88, false, id);
    hero.className = 'hero';
    const emblem = emblemCanvas(lab.icon, hex(lab.color), 96);
    emblem.className = 'emblem';
    art.append(hero, emblem);
    art.setAttribute('aria-hidden', 'true');
    btn.append(art, el('strong', undefined, info.name), el('span', 'personality', HERO_STYLE[id].personality), el('span', undefined, ready ? info.blurb : 'Coming soon'));
    const best = meta.data.highScores[id];
    if (best) btn.append(el('span', 'best', `Best score ${best.toLocaleString('en-US')}`));
    btn.addEventListener('click', () => {
      clearSave();
      start({ lineage: id, formIndex: 0 });
    });
    choices.append(btn);
  }
  inner.append(choices);

  const actions = el('div', 'title-actions');
  const existing = loadSave();
  if (existing && LINEAGES[existing.lineage].forms.length > existing.formIndex) {
    const form = LINEAGES[existing.lineage].forms[existing.formIndex];
    const resume = el('button', 'btn primary', `Continue: ${form.name}`);
    resume.addEventListener('click', () => start(existing));
    actions.append(resume);
  }
  const trophies = el('button', 'btn trophies-btn');
  const renderTrophyBtn = () => {
    const preview = skinPreview(meta.skin, 28);
    preview.style.width = preview.style.height = '28px';
    preview.style.verticalAlign = 'middle';
    trophies.replaceChildren(preview, ` Trophies & skins (${meta.data.achievements.length})`);
  };
  renderTrophyBtn();
  trophies.addEventListener('click', () => void showTrophies(parent, meta, renderTrophyBtn).then(renderTrophyBtn));
  actions.append(trophies);
  inner.append(actions);

  inner.append(
    el('p', 'controls-note', 'Desktop: WASD to swim, drag to look, Shift to boost. Touch: left thumb to swim, right thumb to look, on-screen buttons for everything else.'),
    el(
      'p',
      'disclaimer',
      'An educational fan project. It is not affiliated with or endorsed by OpenAI, Anthropic, Google, Microsoft, Meta, xAI, or any other organization named. No real logos are used: the lab emblems are original doodles. Rival lines are jokes about situations, not quotes. Model names, dates, and training data are presented as historical facts, and every fact card lists its sources.',
    ),
  );
  screen.append(inner);
  parent.append(screen);
}
