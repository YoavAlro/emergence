import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import { STAGE_NAMES } from '../config/models';
import type { AbilityId, ModelForm } from '../config/types';
import type { Action } from '../game/Input';
import { ACCURACY_TO_EVOLVE } from '../game/Progress';
import { CONSTITUTION_HIGH, CONSTITUTION_LOW, formatUsers, type GateCheck } from '../game/RunState';
import { el, hex, pct } from './dom';

export type BannerKind = 'hype' | 'storm' | 'moment' | 'boss' | 'evolve';

export const KIND_LABEL: Record<Exclude<BannerKind, 'evolve'>, string> = {
  hype: 'HYPE WAVE',
  storm: 'STORM',
  moment: 'MOMENT',
  boss: 'BOSS FIGHT',
};

export interface HudEvent {
  kind: 'hype' | 'storm' | 'moment' | 'boss';
  title: string;
  objective: string;
  timeFraction: number;
  secondsLeft: number;
  progress: number;
  /** Hype waves: the bet you can place. */
  bet?: { label: string; cost: number; placed: boolean; affordable: boolean };
}

export interface HudState {
  form: ModelForm;
  next?: ModelForm;
  eaten: number;
  mix: Record<DataTypeId, number>;
  accuracy: number;
  hint: string | null;
  gates: GateCheck[];
  status: string | null;
  compute: number;
  toxicity: number;
  alignment: number;
  constitution: number;
  users: number;
  hype: number;
  trust: number;
  ep: number;
  resets: number;
  abilities: Set<AbilityId>;
  sizeFormName: string | null;
  forkInfo: string | null;
  event: HudEvent | null;
  riding: boolean;
  lingering: string[];
  score: number;
  combo: number;
  multiplier: number;
  comboAlive: boolean;
  highScore: number;
}

interface DietRow {
  id: DataTypeId;
  fill: HTMLDivElement;
  value: HTMLSpanElement;
}

interface MeterRow {
  wrap: HTMLDivElement;
  fill: HTMLDivElement;
  value: HTMLSpanElement;
}

const BUTTONS: { action: Action; label: string; hold?: boolean; needs?: AbilityId | 'always' }[] = [
  { action: 'boost', label: 'BOOST', hold: true, needs: 'always' },
  { action: 'think', label: 'THINK', hold: true, needs: 'think' },
  { action: 'grab', label: 'GRAB', hold: true, needs: 'tools' },
  { action: 'fork', label: 'FORK', needs: 'fork' },
  { action: 'target', label: 'TARGET', needs: 'fork' },
  { action: 'recall', label: 'RECALL', needs: 'fork' },
];

const TOP_BUTTONS: { action: Action; label: string; aria: string; needs?: AbilityId | 'always' | 'resets' }[] = [
  { action: 'pause', label: '❚❚', aria: 'Pause menu', needs: 'always' },
  { action: 'editor', label: 'EDIT', aria: 'Creature editor', needs: 'editor' },
  { action: 'form', label: 'FORM', aria: 'Switch size form', needs: 'sizeForms' },
  { action: 'reset', label: 'RESET', aria: 'Use a banked reset', needs: 'resets' },
];

const KEY_HINTS: { needs: AbilityId | 'always'; text: string }[] = [
  { needs: 'always', text: 'WASD swim · drag to look · Shift boost' },
  { needs: 'editor', text: 'C editor' },
  { needs: 'think', text: 'Space think' },
  { needs: 'tools', text: 'E grab' },
  { needs: 'fork', text: 'F fork · T target · R recall' },
  { needs: 'sizeForms', text: 'Q form' },
  { needs: 'always', text: 'Esc menu' },
];

/** DOM overlay: model card, diet-vs-history panel, meters, events, toasts, touch buttons. */
export class Hud {
  readonly root = el('div', 'hud');
  private readonly stage = el('div', 'hud-stage');
  private readonly model = el('div', 'hud-model');
  private readonly goal = el('div', 'hud-goal');
  private readonly dataBar = el('div', 'bar-fill');
  private readonly dataLabel = el('div', 'bar-label');
  private readonly diet = el('div', 'diet');
  private readonly strip = el('div', 'diet-strip');
  private readonly stripMine = el('div', 'strip-bar');
  private readonly stripTarget = el('div', 'strip-bar target');
  private readonly accuracy = el('div', 'hud-accuracy');
  private readonly gates = el('div', 'hud-gates');
  private readonly status = el('div', 'hud-status');
  private readonly meters = el('div', 'panel hud-meters');
  private readonly meterRows = new Map<string, MeterRow>();
  private readonly epLine = el('div', 'hud-ep');
  private readonly eventPanel = el('div', 'panel hud-event');
  private readonly eventTitle = el('div', 'hud-event-title');
  private readonly eventObjective = el('div', 'hud-event-objective');
  private readonly eventTimer = el('div', 'bar-fill timer');
  private readonly eventProgress = el('div', 'bar-fill progress');
  private readonly betButton = el('button', 'btn bet-btn');
  private readonly banner = el('div', 'hud-banner');
  private readonly ticker = el('div', 'hud-ticker');
  private readonly bubble = el('div', 'hud-bubble');
  private readonly toasts = el('div', 'toasts');
  private readonly scoreBox = el('div', 'panel hud-score');
  private readonly scoreValue = el('div', 'score-value');
  private readonly scoreBest = el('div', 'score-best');
  private readonly comboBox = el('div', 'hud-combo');
  private readonly trophies = el('div', 'trophy-toasts');
  private shownScore = 0;
  private lastCombo = 0;
  private readonly buttons = new Map<Action, HTMLButtonElement>();
  private readonly topButtons = new Map<Action, HTMLButtonElement>();
  private readonly hint = el('div', 'hint');
  private rows: DietRow[] = [];
  private rowsFor = '';
  private hintKey = '';
  private readonly recentToasts = new Map<string, number>();
  private bannerTimer = 0;
  private bubbleTimer = 0;
  private tickerTimer = 0;

  constructor(
    parent: HTMLElement,
    private readonly isTouch: boolean,
    private readonly onAction: (action: Action, down: boolean) => void,
  ) {
    const card = el('div', 'panel hud-card');
    const bar = el('div', 'bar');
    bar.append(this.dataBar, this.dataLabel);
    this.strip.append(el('span', 'strip-label', 'You'), this.stripMine, el('span', 'strip-label', 'Target'), this.stripTarget);
    card.append(this.stage, this.model, this.goal, bar, this.strip, this.diet, this.accuracy, this.gates, this.status);
    if (isTouch) {
      card.classList.add('tappable');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Show or hide diet details');
      card.addEventListener('pointerdown', (e) => e.stopPropagation());
      card.addEventListener('click', () => card.classList.toggle('expanded'));
    }

    for (const [key, label] of [
      ['compute', 'Compute'],
      ['toxicity', 'Toxicity'],
      ['alignment', 'Alignment'],
      ['constitution', 'Constitution'],
      ['users', 'Users'],
      ['hype', 'Hype'],
      ['trust', 'Trust'],
    ] as const) {
      const wrap = el('div', 'meter');
      const head = el('div', 'meter-label', label);
      const value = el('span', 'meter-value');
      head.append(value);
      const barEl = el('div', 'bar small');
      const fill = el('div', `bar-fill ${key}`);
      barEl.append(fill);
      if (key === 'constitution') {
        for (const v of [CONSTITUTION_LOW, CONSTITUTION_HIGH]) {
          const mark = el('div', 'meter-mark');
          mark.style.left = `${v}%`;
          barEl.append(mark);
        }
      }
      wrap.append(head, barEl);
      this.meters.append(wrap);
      this.meterRows.set(key, { wrap, fill, value });
    }
    this.meters.append(this.epLine);

    const timer = el('div', 'bar small');
    timer.append(this.eventTimer);
    const progress = el('div', 'bar small');
    progress.append(this.eventProgress);
    this.betButton.addEventListener('click', () => {
      this.onAction('bet', true);
      this.onAction('bet', false);
    });
    this.eventPanel.append(this.eventTitle, this.eventObjective, timer, progress, this.betButton);
    this.eventPanel.hidden = true;
    this.toasts.setAttribute('aria-live', 'polite');
    this.banner.setAttribute('aria-live', 'assertive');

    const top = el('div', 'top-buttons');
    for (const b of TOP_BUTTONS) {
      const btn = el('button', 'top-btn', b.label);
      btn.setAttribute('aria-label', b.aria);
      btn.addEventListener('click', () => {
        this.onAction(b.action, true);
        this.onAction(b.action, false);
      });
      this.topButtons.set(b.action, btn);
      top.append(btn);
    }

    const left = el('div', 'hud-left');
    left.append(card, this.eventPanel);
    const right = el('div', 'hud-right');
    this.scoreBox.append(this.scoreValue, this.comboBox, this.scoreBest);
    right.append(this.scoreBox, this.meters, top);
    this.trophies.setAttribute('aria-live', 'polite');
    this.root.append(left, right, this.banner, this.ticker, this.bubble, this.toasts, this.trophies);

    const pad = el('div', 'action-pad');
    for (const b of BUTTONS) {
      const btn = el('button', `action-btn ${b.action}`, b.label);
      if (b.hold) {
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          btn.setPointerCapture?.(e.pointerId);
          this.onAction(b.action, true);
        });
        for (const evt of ['pointerup', 'pointercancel'] as const) btn.addEventListener(evt, () => this.onAction(b.action, false));
      } else {
        btn.addEventListener('pointerdown', (e) => e.stopPropagation());
        btn.addEventListener('click', () => {
          this.onAction(b.action, true);
          this.onAction(b.action, false);
        });
      }
      this.buttons.set(b.action, btn);
      pad.append(btn);
    }
    if (isTouch) this.root.append(pad);
    else this.root.append(this.hint);
    parent.append(this.root);
  }

  update(s: HudState): void {
    const eraStage = s.form.stage;
    this.stage.textContent = STAGE_NAMES[eraStage];
    this.model.replaceChildren(el('strong', undefined, s.form.name), el('span', undefined, ` · ${s.sizeFormName ? `${s.sizeFormName} form` : s.form.paramsLabel}`));
    this.model.style.color = hex(s.form.color);

    if (!s.next) {
      this.goal.textContent = 'You reached the frontier.';
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
    this.gates.replaceChildren(
      ...s.gates.map((g) => {
        const have = g.label === 'Users' ? formatUsers(g.have) : `${Math.round(g.have)}`;
        const row = el('div', `gate ${g.ok ? 'ok' : ''}`, `${g.ok ? '✓' : '○'} ${g.label} ${have} / ${g.need}`);
        return row;
      }),
    );
    this.status.textContent = s.status ?? '';
    this.status.hidden = !s.status;

    this.setMeter('compute', s.compute, true, `${Math.round(s.compute)}`);
    this.setMeter('toxicity', s.toxicity, true, `${Math.round(s.toxicity)}`);
    this.setMeter('alignment', s.alignment, s.abilities.has('alignment'), `${Math.round(s.alignment)}`);
    this.setMeter('constitution', s.constitution, s.abilities.has('constitution'), `${Math.round(s.constitution)}`);
    this.setMeter('users', Math.min(100, (Math.log10(Math.max(1, s.users)) / 9) * 100), s.abilities.has('users'), formatUsers(s.users));
    this.setMeter('hype', s.hype, s.abilities.has('timeline'), `${Math.round(s.hype)}`);
    this.setMeter('trust', s.trust, s.abilities.has('trust'), `${Math.round(s.trust)}`);
    const extras = [
      `EP ${s.ep}`,
      s.resets ? `Resets ${'●'.repeat(s.resets)}` : '',
      s.forkInfo ?? '',
      ...s.lingering,
    ].filter(Boolean);
    this.epLine.textContent = extras.join(' · ');

    this.renderScore(s);
    this.renderEvent(s.event);
    this.renderButtons(s);
    this.ticker.classList.toggle('visible', s.riding);
  }

  private renderScore(s: HudState): void {
    // Count up toward the real score so points visibly roll in.
    this.shownScore += Math.ceil((s.score - this.shownScore) * 0.35);
    if (s.score < this.shownScore) this.shownScore = s.score;
    this.scoreValue.textContent = this.shownScore.toLocaleString('en-US');
    this.scoreBest.textContent = s.highScore ? `Best ${s.highScore.toLocaleString('en-US')}` : '';
    const alive = s.comboAlive && s.combo >= 3;
    this.comboBox.hidden = !alive;
    if (alive) {
      this.comboBox.textContent = `${s.combo} combo · ×${s.multiplier}`;
      if (s.combo > this.lastCombo && s.combo % 8 === 0) {
        this.comboBox.classList.remove('pop');
        void this.comboBox.offsetWidth;
        this.comboBox.classList.add('pop');
      }
    }
    this.lastCombo = s.combo;
  }

  /** Achievement sticker that slides in. */
  trophy(name: string, desc: string): void {
    const node = el('div', 'trophy-toast');
    node.append(el('div', 'trophy-icon', '🏆'), el('div', 'trophy-text'));
    node.lastElementChild!.append(el('strong', undefined, `Achievement: ${name}`), el('span', undefined, desc));
    this.trophies.append(node);
    while (this.trophies.children.length > 2) this.trophies.firstChild?.remove();
    setTimeout(() => node.classList.add('fade'), 4200);
    setTimeout(() => node.remove(), 4800);
  }

  private setMeter(key: string, value: number, visible: boolean, text: string): void {
    const row = this.meterRows.get(key)!;
    row.wrap.hidden = !visible;
    if (!visible) return;
    row.fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
    row.value.textContent = ` ${text}`;
  }

  private renderEvent(e: HudEvent | null): void {
    this.eventPanel.hidden = !e;
    if (!e) return;
    this.eventPanel.dataset.kind = e.kind;
    const kindLabel = KIND_LABEL[e.kind];
    this.eventTitle.textContent = `${kindLabel} · ${e.title} · ${Math.ceil(e.secondsLeft)}s`;
    this.eventObjective.textContent = e.objective;
    this.eventTimer.style.width = pct(e.timeFraction);
    this.eventProgress.style.width = pct(e.progress);
    this.eventProgress.parentElement!.hidden = e.kind === 'hype';
    if (e.bet) {
      this.betButton.hidden = false;
      this.betButton.disabled = e.bet.placed || !e.bet.affordable;
      this.betButton.textContent = e.bet.placed
        ? `Adopted: ${e.bet.label}`
        : `${this.isTouch ? '' : '[B] '}Bet ${e.bet.cost} EP: ${e.bet.label}`;
    } else {
      this.betButton.hidden = true;
    }
  }

  private renderButtons(s: HudState): void {
    const has = (n: string | undefined) =>
      n === 'always' || (n === 'resets' ? s.resets > 0 : s.abilities.has(n as AbilityId));
    for (const b of BUTTONS) this.buttons.get(b.action)!.hidden = !has(b.needs);
    for (const b of TOP_BUTTONS) this.topButtons.get(b.action)!.hidden = !has(b.needs);
    if (!this.isTouch) {
      const key = KEY_HINTS.filter((h) => has(h.needs)).map((h) => h.text).join(' · ');
      if (key !== this.hintKey) {
        this.hintKey = key;
        this.hint.textContent = key;
      }
    }
  }

  /** Big announcement at the top of the screen. */
  showBanner(title: string, text: string, kind: BannerKind, seconds = 4.5): void {
    this.banner.replaceChildren(el('strong', undefined, title), el('span', undefined, text));
    this.banner.dataset.kind = kind;
    this.banner.classList.add('visible');
    window.clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.banner.classList.remove('visible'), seconds * 1000);
  }

  /** A post drifting past in the Timeline Current ticker. */
  post(text: string): void {
    window.clearTimeout(this.tickerTimer);
    this.ticker.replaceChildren(el('span', 'ticker-handle', '@someone'), el('span', undefined, ` ${text}`));
  }

  /** Speech bubble from your creature. */
  say(text: string): void {
    this.bubble.textContent = text;
    this.bubble.classList.add('visible');
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.bubble.classList.remove('visible'), 2600);
  }

  toast(message: string, kind: 'info' | 'good' | 'bad' = 'info', cooldownMs = 4000): void {
    const now = performance.now();
    if ((this.recentToasts.get(message) ?? -Infinity) > now - cooldownMs) return;
    this.recentToasts.set(message, now);
    const node = el('div', `toast ${kind}`, message);
    this.toasts.append(node);
    while (this.toasts.children.length > 3) this.toasts.firstChild?.remove();
    setTimeout(() => node.classList.add('fade'), 3400);
    setTimeout(() => node.remove(), 4000);
  }

  private renderDiet(next: ModelForm, mix: Record<DataTypeId, number>): void {
    if (this.rowsFor !== next.id) {
      this.rowsFor = next.id;
      const ids = [...new Set([...Object.keys(next.recipe), ...Object.keys(next.spawn)])]
        .map((id) => DATA_TYPES[id as DataTypeId].countsAs ?? (id as DataTypeId))
        .filter((id, i, arr) => arr.indexOf(id) === i);
      this.diet.replaceChildren();
      this.rows = ids.map((id) => {
        const type = DATA_TYPES[id];
        const row = el('div', 'diet-row');
        const track = el('div', 'diet-track');
        const fill = el('div', 'diet-fill');
        const marker = el('div', 'diet-marker');
        fill.style.background = hex(type.color);
        marker.style.left = pct(next.recipe[id] ?? 0);
        marker.title = `Target ${next.name} mix: ${pct(next.recipe[id] ?? 0)}`;
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
    const segs = (shares: (id: DataTypeId) => number) =>
      this.rows
        .filter((r) => shares(r.id) > 0)
        .map((r) => {
          const seg = el('span', 'strip-seg');
          seg.style.width = pct(shares(r.id));
          seg.style.background = hex(DATA_TYPES[r.id].color);
          return seg;
        });
    this.stripMine.replaceChildren(...segs((id) => mix[id]));
    const key = next.id;
    if (this.stripTarget.dataset.for !== key) {
      this.stripTarget.dataset.for = key;
      this.stripTarget.replaceChildren(...segs((id) => next.recipe[id] ?? 0));
    }
  }
}
