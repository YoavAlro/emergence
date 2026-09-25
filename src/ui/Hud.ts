import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import { STAGE_NAMES, type ModelForm } from '../config/models';
import { ACCURACY_TO_EVOLVE } from '../game/Progress';
import { el, hex, pct } from './dom';

export interface HudState {
  form: ModelForm;
  next?: ModelForm;
  eaten: number;
  mix: Record<DataTypeId, number>;
  accuracy: number;
  hint: string | null;
  compute: number;
  toxicity: number;
}

interface DietRow {
  id: DataTypeId;
  fill: HTMLDivElement;
  value: HTMLSpanElement;
}

/** DOM overlay: model card, diet-vs-history panel, meters, toasts, touch buttons. */
export class Hud {
  readonly root = el('div', 'hud');
  private readonly stage = el('div', 'hud-stage');
  private readonly model = el('div', 'hud-model');
  private readonly goal = el('div', 'hud-goal');
  private readonly dataBar = el('div', 'bar-fill');
  private readonly dataLabel = el('div', 'bar-label');
  private readonly diet = el('div', 'diet');
  private readonly accuracy = el('div', 'hud-accuracy');
  private readonly computeFill = el('div', 'bar-fill compute');
  private readonly toxicFill = el('div', 'bar-fill toxic');
  private readonly toasts = el('div', 'toasts');
  private rows: DietRow[] = [];
  private rowsFor = '';
  private readonly recentToasts = new Map<string, number>();

  constructor(parent: HTMLElement, isTouch: boolean, onBoost: (held: boolean) => void) {
    const card = el('div', 'panel hud-card');
    const bar = el('div', 'bar');
    bar.append(this.dataBar, this.dataLabel);
    card.append(this.stage, this.model, this.goal, bar, this.diet, this.accuracy);

    const meters = el('div', 'panel hud-meters');
    meters.append(meter('Compute', this.computeFill), meter('Toxicity', this.toxicFill));

    this.root.append(card, meters, this.toasts);

    if (isTouch) {
      const boost = el('button', 'boost-btn', 'BOOST');
      boost.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        onBoost(true);
      });
      for (const evt of ['pointerup', 'pointercancel', 'pointerleave'] as const) {
        boost.addEventListener(evt, () => onBoost(false));
      }
      this.root.append(boost);
    } else {
      this.root.append(el('div', 'hint', 'WASD swim · drag to look · Shift boost'));
    }
    parent.append(this.root);
  }

  update(s: HudState): void {
    this.stage.textContent = STAGE_NAMES[s.form.stage];
    this.model.innerHTML = '';
    this.model.append(el('strong', undefined, s.form.name), el('span', undefined, ` · ${s.form.paramsLabel}`));
    this.model.style.color = hex(s.form.color);

    if (!s.next) {
      this.goal.textContent = 'Stage 1 complete. Stages 2–3 are next on the roadmap.';
      this.dataBar.style.width = '100%';
      this.dataLabel.textContent = '';
      this.diet.replaceChildren();
      this.accuracy.textContent = '';
    } else {
      this.goal.textContent = `Training toward ${s.next.name} · ${s.next.fact.date.split(' · ')[0]}`;
      this.dataBar.style.width = pct(Math.min(1, s.eaten / s.next.target));
      this.dataLabel.textContent = `Data ${s.eaten} / ${s.next.target}`;
      this.renderDiet(s.next, s.mix);
      const ok = s.accuracy >= ACCURACY_TO_EVOLVE;
      this.accuracy.textContent = `Diet matches history: ${pct(s.accuracy)}${s.hint ? ` · ${s.hint}` : ''}`;
      this.accuracy.classList.toggle('ok', ok);
    }

    this.computeFill.style.width = pct(s.compute / 100);
    this.toxicFill.style.width = pct(s.toxicity / 100);
  }

  toast(message: string, kind: 'info' | 'good' | 'bad' = 'info', cooldownMs = 4000): void {
    const now = performance.now();
    if ((this.recentToasts.get(message) ?? -Infinity) > now - cooldownMs) return;
    this.recentToasts.set(message, now);
    const node = el('div', `toast ${kind}`, message);
    this.toasts.append(node);
    while (this.toasts.children.length > 3) this.toasts.firstChild?.remove();
    setTimeout(() => node.classList.add('fade'), 2800);
    setTimeout(() => node.remove(), 3400);
  }

  private renderDiet(next: ModelForm, mix: Record<DataTypeId, number>): void {
    if (this.rowsFor !== next.id) {
      this.rowsFor = next.id;
      const ids = [...new Set([...Object.keys(next.recipe), ...Object.keys(next.spawn)])] as DataTypeId[];
      this.diet.replaceChildren();
      this.rows = ids.map((id) => {
        const type = DATA_TYPES[id];
        const row = el('div', 'diet-row');
        const track = el('div', 'diet-track');
        const fill = el('div', 'diet-fill');
        const marker = el('div', 'diet-marker');
        fill.style.background = hex(type.color);
        marker.style.left = pct(next.recipe[id] ?? 0);
        marker.title = `Real ${next.name} mix: ${pct(next.recipe[id] ?? 0)}`;
        track.append(fill, marker);
        const value = el('span', 'diet-value');
        const label = el('span', 'diet-label', type.label);
        label.style.color = hex(type.color);
        row.append(label, track, value);
        this.diet.append(row);
        return { id, fill, value };
      });
    }
    for (const row of this.rows) {
      row.fill.style.width = pct(mix[row.id]);
      row.value.textContent = `${pct(mix[row.id])} / ${pct(next.recipe[row.id] ?? 0)}`;
    }
  }
}

function meter(label: string, fill: HTMLDivElement): HTMLDivElement {
  const wrap = el('div', 'meter');
  const bar = el('div', 'bar small');
  bar.append(fill);
  wrap.append(el('div', 'meter-label', label), bar);
  return wrap;
}
