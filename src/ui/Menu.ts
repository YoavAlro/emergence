import type { Meta } from '../game/Meta';
import type { Settings } from '../save';
import { el } from './dom';
import { showPanel } from './FactCard';

export type MenuResult = 'resume' | 'quit' | 'trophies';

const HOW_TO = [
  'Follow the "Eat" chip and the arrow: the data your diet needs most is drawn bigger and bobs. The camera turns to follow you, so just steer.',
  'Power-ups (starburst stickers): Data Magnet, Spare GPUs (free boost), Safety Filter (blocks a hit), Viral Moment (×2 points), Longer Context (bigger reach). Challenges pop up between events for bonus points.',
  'Eat the data your real lab trained on. The diet panel shows your mix against the target; match it at least 65% to evolve.',
  'Hallucinations (rainbow question marks) and toxic smog (purple clouds) cost you data. Rivals, sharks, jailbreakers, and eels hunt you.',
  'Eat quickly for combos: every 8 in a row adds ×0.5 to your points (up to ×5). Getting hit breaks the combo.',
  'Boss fights: each era a rival lab’s model shows up. Dodge while it attacks, then bonk it while it is dizzy (flashing yellow). BOOST into it for double damage.',
  'Stage 2+: spend evolution points (EP) in the creature editor. Keep Alignment up by eating Human Feedback.',
  'Stage 3+: ride the Timeline Current to go viral. Bet EP on Hype Waves, then decide: hype or lasting shift?',
  'Stage 4+: GRAB with tool limbs and swim through portals into the live internet.',
  'Stage 5+: hold THINK to slow time, see hidden reasoning traces, and spot fakes (they turn grey).',
  'Stage 6+: FORK sub-agents that forage for you. Keep them out of smog, or they go rogue.',
  'Stage 7: build Trust and Alignment to finish a phased rollout.',
];

/** Pause menu with settings. */
export function showMenu(parent: HTMLElement, settings: Settings, onSettings: (s: Settings) => void, meta?: Meta): Promise<MenuResult> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, 'Paused', 0x7fd4ff, 'menu');
    const toggles: { key: keyof Settings; label: string }[] = [
      { key: 'audio', label: 'Sound' },
      { key: 'reducedMotion', label: 'Reduced motion (no screen shake or camera sway)' },
      { key: 'largeText', label: 'Larger text' },
    ];
    for (const t of toggles) {
      const row = el('label', 'toggle');
      const box = el('input');
      box.type = 'checkbox';
      box.checked = settings[t.key] as boolean;
      box.addEventListener('change', () => {
        (settings[t.key] as boolean) = box.checked;
        onSettings(settings);
      });
      row.append(box, el('span', undefined, t.label));
      body.append(row);
    }
    const quality = el('label', 'toggle');
    const select = el('select');
    for (const q of ['auto', 'high', 'low'] as const) {
      const o = el('option', undefined, `Graphics: ${q}`);
      o.value = q;
      o.selected = settings.quality === q;
      select.append(o);
    }
    select.addEventListener('change', () => {
      settings.quality = select.value as Settings['quality'];
      onSettings(settings);
    });
    quality.append(select, el('span', undefined, 'Takes effect after reload'));
    body.append(quality);

    const how = el('details', 'how-to');
    how.append(el('summary', undefined, 'How to play'));
    const ul = el('ul');
    for (const line of HOW_TO) ul.append(el('li', undefined, line));
    how.append(ul);
    body.append(how);

    const row = el('div', 'choice-row');
    const resume = el('button', 'btn primary', 'Resume');
    resume.addEventListener('click', () => {
      close();
      resolve('resume');
    });
    const quit = el('button', 'btn', 'Save & quit to title');
    quit.addEventListener('click', () => {
      close();
      resolve('quit');
    });
    row.append(resume);
    if (meta) {
      const trophies = el('button', 'btn', `Trophies & skins (${meta.data.achievements.length})`);
      trophies.addEventListener('click', () => {
        close();
        resolve('trophies');
      });
      row.append(trophies);
    }
    row.append(quit);
    body.append(row);
    resume.focus();
  });
}
