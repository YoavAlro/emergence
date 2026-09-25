import { PARTS, SLOT_CAPACITY, SLOT_LABELS } from '../config/parts';
import type { PartId, PartSlot } from '../config/types';
import type { RunState } from '../game/RunState';
import { el, hex } from './dom';
import { showPanel } from './FactCard';

/** The creature editor: spend evolution points on parts, Spore-style. */
export function showEditor(
  parent: HTMLElement,
  run: RunState,
  available: PartId[],
  color: number,
  onChange: () => void,
): Promise<void> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, 'Creature editor', color, 'editor');
    const render = () => {
      body.replaceChildren();
      body.append(
        el('p', 'editor-intro', 'Spend evolution points (EP) on parts. You earn EP by evolving, surviving storms, and winning moments. Bought parts can be swapped freely.'),
        el('div', 'editor-ep', `Evolution points: ${run.ep}`),
      );
      const bySlot = new Map<PartSlot, PartId[]>();
      for (const id of available) {
        const slot = PARTS[id].slot;
        bySlot.set(slot, [...(bySlot.get(slot) ?? []), id]);
      }
      for (const [slot, ids] of bySlot) {
        const section = el('div', 'editor-slot');
        const used = run.equipped.filter((p) => PARTS[p].slot === slot).length;
        section.append(el('div', 'editor-slot-title', `${SLOT_LABELS[slot]} (${used}/${SLOT_CAPACITY[slot]})`));
        for (const id of ids) {
          const part = PARTS[id];
          const row = el('div', 'editor-part');
          const name = el('div', 'editor-part-name', part.name);
          name.style.color = hex(part.color);
          const info = el('div', 'editor-part-info');
          info.append(name, el('div', 'editor-part-blurb', part.blurb));
          const equipped = run.equipped.includes(id);
          const owned = run.ownedParts.has(id);
          const btn = el(
            'button',
            `btn small ${equipped ? '' : 'primary'}`,
            equipped ? 'Remove' : owned ? 'Equip' : `Buy · ${part.cost} EP`,
          );
          btn.disabled = !equipped && !owned && run.ep < part.cost;
          btn.addEventListener('click', () => {
            if (equipped) run.unequip(id);
            else run.equip(id);
            onChange();
            render();
          });
          row.append(info, btn);
          section.append(row);
        }
        body.append(section);
      }
      if (!available.length) body.append(el('p', undefined, 'No parts unlocked yet.'));
      const done = el('button', 'btn primary', 'Done');
      done.addEventListener('click', () => {
        close();
        resolve();
      });
      body.append(done);
    };
    render();
    (body.querySelector('button') as HTMLElement | null)?.focus();
  });
}
