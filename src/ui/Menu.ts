import type { Settings } from '../save';
import { el } from './dom';
import { showPanel } from './FactCard';

export type MenuResult = 'resume' | 'quit';

const HOW_TO = [
  'Eat the data your real lab trained on. The diet panel shows your mix against the target; match it at least 65% to evolve.',
  'Hallucinations (rainbow) and toxic smog (red clouds) cost you data. Rivals, sharks, jailbreakers, and eels hunt you.',
  'Stage 2+: spend evolution points (EP) in the creature editor. Keep Alignment up by eating Human Feedback.',
  'Stage 3+: ride the Timeline Current to go viral. Bet EP on Hype Waves, then decide: hype or lasting shift?',
  'Stage 4+: GRAB with tool limbs and swim through portals into the live internet.',
  'Stage 5+: hold THINK to slow time, see hidden reasoning traces, and spot fakes (they turn grey).',
  'Stage 6+: FORK sub-agents that forage for you. Keep them out of smog, or they go rogue.',
  'Stage 7: build Trust and Alignment to finish a phased rollout.',
];

/** Pause menu with settings. */
export function showMenu(parent: HTMLElement, settings: Settings, onSettings: (s: Settings) => void): Promise<MenuResult> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, 'Paused', 0x7fd4ff, 'menu');
    const toggles: { key: keyof Settings; label: string }[] = [
      { key: 'audio', label: 'Sound' },
      { key: 'reducedMotion', label: 'Reduced motion (less bloom and camera sway)' },
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
    row.append(resume, quit);
    body.append(row);
    resume.focus();
  });
}
