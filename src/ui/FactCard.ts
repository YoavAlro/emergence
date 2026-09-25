import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import type { FactCard, Mix } from '../config/types';
import { el, hex, pct } from './dom';

export interface FactCardOptions {
  card: FactCard;
  color: number;
  /** When set, shows the player's diet against the real training mix. */
  diet?: { mine: Record<DataTypeId, number>; real: Mix; note?: string };
  /** Short lines shown above the fact lines (e.g. what you won). */
  outcome?: { text: string; kind: 'good' | 'bad' | 'info' }[];
  button?: string;
}

/** Tracks open modals so the game can pause input behind them. */
let openModals = 0;
export const modalOpen = () => openModals > 0;

/** Debug fast-forward: modals resolve instantly with their default choice. */
let autoModals = false;
export const setAutoModals = (v: boolean) => {
  autoModals = v;
};
export const isAutoModals = () => autoModals;

function openModal(parent: HTMLElement, modal: HTMLElement, labelId: string): { close: () => void } {
  const backdrop = el('div', 'modal-backdrop');
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', labelId);
  backdrop.append(modal);
  parent.append(backdrop);
  openModals++;
  const previous = document.activeElement as HTMLElement | null;
  const trap = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll<HTMLElement>('button, a[href]')].filter((n) => !n.hasAttribute('disabled'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  modal.addEventListener('keydown', trap);
  return {
    close: () => {
      backdrop.remove();
      openModals--;
      previous?.focus?.();
    },
  };
}

let idCounter = 0;

export function renderFact(card: FactCard, color: number, into: HTMLElement): string {
  const id = `modal-title-${++idCounter}`;
  const title = el('h2', undefined, card.title);
  title.id = id;
  title.style.color = hex(color);
  const list = el('ul');
  for (const line of card.lines) list.append(el('li', undefined, line));
  into.append(el('div', 'modal-date', card.date), title, list);
  if (card.sources.length) {
    const src = el('details', 'sources');
    src.append(el('summary', undefined, `Sources (${card.sources.length})`));
    const ul = el('ul');
    for (const s of card.sources) {
      const li = el('li');
      const a = el('a', undefined, s.label);
      a.href = s.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.append(a);
      ul.append(li);
    }
    src.append(ul);
    into.append(src);
  }
  return id;
}

/** Modal history card. Resolves when the player continues. */
export function showFactCard(parent: HTMLElement, opts: FactCardOptions): Promise<void> {
  if (autoModals) return Promise.resolve();
  return new Promise((resolve) => {
    const modal = el('div', 'panel modal');
    modal.style.borderColor = hex(opts.color);
    if (opts.outcome?.length) {
      const box = el('div', 'outcome');
      for (const o of opts.outcome) box.append(el('div', `outcome-line ${o.kind}`, o.text));
      modal.append(box);
    }
    const labelId = renderFact(opts.card, opts.color, modal);

    if (opts.diet) {
      const table = el('div', 'diet-compare');
      table.append(el('div', 'diet-compare-title', 'Your diet vs the target mix'));
      const ids = Object.keys(opts.diet.real) as DataTypeId[];
      for (const id of ids) {
        const row = el('div', undefined, `${DATA_TYPES[id].label}: ${pct(opts.diet.mine[id])} vs ${pct(opts.diet.real[id] ?? 0)}`);
        row.style.color = hex(DATA_TYPES[id].color);
        table.append(row);
      }
      if (opts.diet.note) table.append(el('div', 'diet-note', opts.diet.note));
      modal.append(table);
    }

    const button = el('button', 'btn primary', opts.button ?? 'Continue');
    modal.append(button);
    const { close } = openModal(parent, modal, labelId);
    button.addEventListener('click', () => {
      close();
      resolve();
    });
    button.focus();
  });
}

export interface ChoiceOptions {
  title: string;
  subtitle?: string;
  lines?: string[];
  color: number;
  choices: { label: string; detail?: string }[];
}

/** A question with buttons. Resolves with the chosen index. */
export function showChoice(parent: HTMLElement, opts: ChoiceOptions): Promise<number> {
  if (autoModals) return Promise.resolve(0);
  return new Promise((resolve) => {
    const modal = el('div', 'panel modal');
    modal.style.borderColor = hex(opts.color);
    const id = `modal-title-${++idCounter}`;
    if (opts.subtitle) modal.append(el('div', 'modal-date', opts.subtitle));
    const title = el('h2', undefined, opts.title);
    title.id = id;
    title.style.color = hex(opts.color);
    modal.append(title);
    if (opts.lines?.length) {
      const list = el('ul');
      for (const l of opts.lines) list.append(el('li', undefined, l));
      modal.append(list);
    }
    const row = el('div', 'choice-row');
    const { close } = openModal(parent, modal, id);
    opts.choices.forEach((c, i) => {
      const b = el('button', 'btn choice');
      b.append(el('strong', undefined, c.label));
      if (c.detail) b.append(el('span', undefined, c.detail));
      b.addEventListener('click', () => {
        close();
        resolve(i);
      });
      row.append(b);
    });
    modal.append(row);
    (row.firstElementChild as HTMLElement | null)?.focus();
  });
}

/** A custom-content modal (mini-games, editor). Returns the modal element and a closer. */
export function showPanel(parent: HTMLElement, title: string, color: number, className = ''): { body: HTMLElement; close: () => void } {
  const modal = el('div', `panel modal ${className}`);
  modal.style.borderColor = hex(color);
  const id = `modal-title-${++idCounter}`;
  const h = el('h2', undefined, title);
  h.id = id;
  h.style.color = hex(color);
  modal.append(h);
  const body = el('div', 'panel-body');
  modal.append(body);
  const { close } = openModal(parent, modal, id);
  return { body, close };
}
