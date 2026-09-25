import { ACHIEVEMENTS, SKINS, type SkinSpec } from '../config/achievements';
import type { Meta } from '../game/Meta';
import { el, hex } from './dom';
import { INK, Pen } from './doodle';
import { showPanel } from './FactCard';

const DEFAULT_BODY = 0x7fd4ff;

/** A little doodle of your creature wearing the skin. */
export function skinPreview(skin: SkinSpec, size = 72, locked = false): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size * 2;
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  const pen = new Pen(ctx, skin.id.length * 7 + 3, 1.2);
  const r = size * 0.3;
  const cx = size / 2;
  const cy = size * 0.58;
  ctx.lineWidth = 3;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  ctx.fillStyle = locked ? '#8a8699' : hex(skin.color ?? DEFAULT_BODY);
  pen.circle(cx, cy, r);
  pen.fillStroke(ctx.fillStyle as string, 3);
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    pen.circle(cx + s * r * 0.38, cy - r * 0.15, r * 0.28);
    pen.fillStroke(ctx.fillStyle as string, 3);
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx + s * r * 0.38, cy - r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  const top = cy - r;
  switch (locked ? 'none' : skin.accessory) {
    case 'partyHat':
      ctx.fillStyle = '#ff5ca8';
      pen.path([[cx - r * 0.45, top + 4], [cx + r * 0.45, top + 4], [cx + r * 0.1, top - r * 0.9]], true);
      pen.fillStroke(ctx.fillStyle as string, 3);
      break;
    case 'shades':
      ctx.fillStyle = INK;
      pen.rect(cx - r * 0.75, cy - r * 0.35, r * 1.5, r * 0.4);
      pen.fillStroke(ctx.fillStyle as string, 3);
      break;
    case 'bowtie':
      ctx.fillStyle = '#e03a5a';
      pen.path([[cx, cy + r * 1.02], [cx - r * 0.45, cy + r * 0.8], [cx - r * 0.45, cy + r * 1.25]], true);
      pen.fillStroke(ctx.fillStyle as string, 3);
      pen.path([[cx, cy + r * 1.02], [cx + r * 0.45, cy + r * 0.8], [cx + r * 0.45, cy + r * 1.25]], true);
      pen.fillStroke(ctx.fillStyle as string, 3);
      break;
    case 'crown':
      ctx.fillStyle = '#ffd84d';
      pen.path(
        [
          [cx - r * 0.5, top + 4],
          [cx - r * 0.55, top - r * 0.45],
          [cx - r * 0.2, top - r * 0.15],
          [cx, top - r * 0.6],
          [cx + r * 0.2, top - r * 0.15],
          [cx + r * 0.55, top - r * 0.45],
          [cx + r * 0.5, top + 4],
        ],
        true,
      );
      pen.fillStroke(ctx.fillStyle as string, 3);
      break;
    case 'halo':
      ctx.strokeStyle = '#ffd84d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(cx, top - r * 0.3, r * 0.6, r * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
  if (locked) {
    ctx.fillStyle = INK;
    ctx.font = `700 ${Math.round(size * 0.28)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('?', cx, cy + r * 0.45);
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
