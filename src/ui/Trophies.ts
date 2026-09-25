import { ACHIEVEMENTS, SKINS, type SkinSpec } from '../config/achievements';
import type { Meta } from '../game/Meta';
import { el, hex } from './dom';
import { HERO_STYLE } from '../config/labs';
import { SIZE, drawHero } from './creatures';
import { INK } from './doodle';
import { showPanel } from './FactCard';

/** Your hero wearing the skin, as a doodle. */
export function skinPreview(skin: SkinSpec, size = 72, locked = false, lineage: 'gpt' | 'claude' = 'claude'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale((size * 2) / SIZE, (size * 2) / SIZE);
  drawHero(ctx, {
    style: HERO_STYLE[lineage],
    body: locked ? '#8a8699' : skin.color !== undefined ? hex(skin.color) : undefined,
    stage: 3,
    freckles: 3,
    parts: [],
    accessory: locked ? 'none' : skin.accessory,
    mouthOpen: false,
    blink: false,
    frame: 0,
  });
  if (locked) {
    ctx.fillStyle = INK;
    ctx.font = '800 90px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', SIZE / 2, SIZE * 0.72);
  }
  return c;
}

/** Trophy case plus the skin picker. Resolves when closed. */
export function showTrophies(parent: HTMLElement, meta: Meta, onSkin?: () => void): Promise<void> {
  return new Promise((resolve) => {
    const unlocked = ACHIEVEMENTS.filter((a) => meta.has(a.id)).length;
    const { body, close } = showPanel(parent, `Trophies ${unlocked} / ${ACHIEVEMENTS.length}`, 0xffd84d, 'trophies');

    const best = meta.data.highScores;
    body.append(
      el(
        'p',
        'trophy-scores',
        `High scores: GPT lineage ${(best.gpt ?? 0).toLocaleString('en-US')} · Claude lineage ${(best.claude ?? 0).toLocaleString('en-US')}`,
      ),
    );

    body.append(el('h3', undefined, 'Skins'));
    const skins = el('div', 'skin-grid');
    const render = () => {
      skins.replaceChildren(
        ...SKINS.map((skin) => {
          const ok = meta.skinUnlocked(skin);
          const btn = el('button', `skin ${meta.skin.id === skin.id ? 'selected' : ''}`);
          btn.disabled = !ok;
          const need = skin.unlock ? ACHIEVEMENTS.find((a) => a.id === skin.unlock) : null;
          btn.setAttribute('aria-label', ok ? `Wear ${skin.name}` : `${skin.name}, locked: ${need?.name}`);
          btn.append(skinPreview(skin, 72, !ok), el('strong', undefined, skin.name), el('span', undefined, ok ? (meta.skin.id === skin.id ? 'Wearing' : 'Tap to wear') : `Unlock: ${need?.name}`));
          btn.addEventListener('click', () => {
            meta.data.skin = skin.id;
            meta.save();
            onSkin?.();
            render();
          });
          return btn;
        }),
      );
    };
    render();
    body.append(skins);

    body.append(el('h3', undefined, 'Achievements'));
    const list = el('div', 'trophy-list');
    for (const a of ACHIEVEMENTS) {
      const got = meta.has(a.id);
      const row = el('div', `trophy ${got ? 'got' : ''}`);
      row.append(el('span', 'trophy-badge', got ? '🏆' : '🔒'), el('strong', undefined, a.name), el('span', undefined, a.desc));
      list.append(row);
    }
    body.append(list);

    const done = el('button', 'btn primary', 'Done');
    done.addEventListener('click', () => {
      close();
      resolve();
    });
    body.append(done);
    done.focus();
  });
}
