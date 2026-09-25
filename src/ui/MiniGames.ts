import type { MiniGameSpec } from '../config/types';
import { el } from './dom';
import { showPanel } from './FactCard';

export interface MiniGameContext {
  title: string;
  color: number;
  /** Think mode is unlocked: the creature can reason step by step. */
  canThink: boolean;
}

/** Runs a DOM mini-game. Resolves true on a win. */
export function playMiniGame(parent: HTMLElement, spec: MiniGameSpec, ctx: MiniGameContext): Promise<boolean> {
  switch (spec.kind) {
    case 'letterCount':
      return letterCount(parent, spec, ctx);
    case 'order':
      return order(parent, spec, ctx);
    case 'chart':
      return chart(parent, spec, ctx);
    case 'maze':
      return maze(parent, spec, ctx);
    case 'shop':
      return shop(parent, spec, ctx);
  }
}

function finishButton(body: HTMLElement, label: string, onClick: () => void): void {
  const b = el('button', 'btn primary', label);
  b.addEventListener('click', onClick);
  body.append(b);
  b.focus();
}

function letterCount(parent: HTMLElement, spec: Extract<MiniGameSpec, { kind: 'letterCount' }>, ctx: MiniGameContext): Promise<boolean> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, ctx.title, ctx.color, 'minigame');
    body.append(el('p', 'mg-question', `How many ${spec.letter}'s are in "${spec.word.toLowerCase()}"?`));
    const view = el('div', 'mg-tokens');
    body.append(view);
    const done = (win: boolean, text: string) => {
      body.append(el('p', `mg-result ${win ? 'good' : 'bad'}`, text));
      finishButton(body, 'Continue', () => {
        close();
        resolve(win);
      });
    };
    const showLetters = () => {
      view.replaceChildren();
      for (const ch of spec.word) {
        const c = el('span', `mg-letter ${ch === spec.letter ? 'hit' : ''}`, ch);
        view.append(c);
      }
    };
    if (!spec.thinks) {
      view.append(el('span', 'mg-caption', 'What you actually see:'));
      for (const t of spec.tokens) view.append(el('span', 'mg-token', t));
      const say = el('p', 'mg-say', 'Your creature answers instantly, very confidently…');
      body.append(say);
      setTimeout(() => {
        say.textContent = `"There are ${spec.naiveAnswer} ${spec.letter}'s in ${spec.word.toLowerCase()}." 😎`;
        setTimeout(() => {
          showLetters();
          done(false, `Actually there are ${spec.answer}. You read tokens, not letters. You'll need to think step by step.`);
        }, 1400);
      }, 1100);
      return;
    }
    view.append(el('span', 'mg-caption', 'Think it through: spell it out letter by letter.'));
    let i = 0;
    const spell = el('div', 'mg-tokens');
    body.append(spell);
    const timer = setInterval(() => {
      const ch = spec.word[i];
      spell.append(el('span', `mg-letter ${ch === spec.letter ? 'hit' : ''}`, ch));
      if (++i >= spec.word.length) {
        clearInterval(timer);
        const row = el('div', 'choice-row');
        for (const n of [1, 2, 3, 4]) {
          const b = el('button', 'btn choice', `${n}`);
          b.addEventListener('click', () => {
            row.remove();
            done(n === spec.answer, n === spec.answer ? `Correct: ${spec.answer}. Thinking step by step fixed it.` : `Not quite. It's ${spec.answer}.`);
          });
          row.append(b);
        }
        body.append(row);
        (row.firstElementChild as HTMLElement).focus();
      }
    }, 180);
  });
}

function order(parent: HTMLElement, spec: Extract<MiniGameSpec, { kind: 'order' }>, ctx: MiniGameContext): Promise<boolean> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, ctx.title, ctx.color, 'minigame');
    body.append(el('p', 'mg-question', spec.prompt));
    const real = spec.items.filter((it) => !it.decoy);
    const picked = el('div', 'mg-picked');
    const pool = el('div', 'mg-pool');
    const status = el('p', 'mg-status', 'Mistakes: 0');
    body.append(picked, pool, status);
    let next = 0;
    let mistakes = 0;
    const shuffled = [...spec.items].sort(() => Math.random() - 0.5);
    for (const item of shuffled) {
      const b = el('button', 'btn chip', item.label);
      b.addEventListener('click', () => {
        if (item.decoy) {
          mistakes++;
          b.disabled = true;
          b.classList.add('wrong');
          b.textContent = `${item.label}: ${item.note ?? 'decoy'}`;
        } else if (item === real[next]) {
          next++;
          b.remove();
          picked.append(el('span', 'mg-chip-done', `${item.label} · ${item.note ?? ''}`));
        } else {
          mistakes++;
          b.classList.add('shake');
          setTimeout(() => b.classList.remove('shake'), 400);
        }
        status.textContent = `Mistakes: ${mistakes}`;
        if (next === real.length) {
          pool.remove();
          const win = mistakes <= 2;
          body.append(el('p', `mg-result ${win ? 'good' : 'bad'}`, win ? 'You navigated the Naming Maze!' : 'Confusing, right? That was the point.'));
          finishButton(body, 'Continue', () => {
            close();
            resolve(win);
          });
        }
      });
      pool.append(b);
    }
    (pool.firstElementChild as HTMLElement).focus();
  });
}

function chart(parent: HTMLElement, spec: Extract<MiniGameSpec, { kind: 'chart' }>, ctx: MiniGameContext): Promise<boolean> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, ctx.title, ctx.color, 'minigame');
    body.append(el('p', 'mg-question', spec.prompt));
    const plot = el('div', 'mg-chart');
    const max = Math.max(...spec.bars.map((b) => Math.max(b.value, b.drawnAs)));
    const bars = spec.bars.map((bar) => {
      const col = el('button', 'mg-bar-col');
      col.setAttribute('aria-label', `${bar.label}: ${bar.value}%`);
      const fill = el('div', 'mg-bar');
      fill.style.height = `${(bar.drawnAs / max) * 100}%`;
      col.append(el('span', 'mg-bar-value', `${bar.value}%`), fill, el('span', 'mg-bar-label', bar.label));
      plot.append(col);
      return { col, fill, bar };
    });
    body.append(plot);
    for (const { col, bar } of bars) {
      col.addEventListener('click', () => {
        const win = bar.value !== bar.drawnAs;
        for (const b of bars) {
          b.col.disabled = true;
          b.fill.style.height = `${(b.bar.value / max) * 100}%`;
          if (b.bar.value !== b.bar.drawnAs) b.fill.classList.add('fixed');
        }
        body.append(el('p', `mg-result ${win ? 'good' : 'bad'}`, win ? 'Chart fixed! Bars should match their numbers.' : 'That one was fine. The fixed chart is shown now.'));
        finishButton(body, 'Continue', () => {
          close();
          resolve(win);
        });
      });
    }
    bars[0].col.focus();
  });
}

function maze(parent: HTMLElement, spec: Extract<MiniGameSpec, { kind: 'maze' }>, ctx: MiniGameContext): Promise<boolean> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, ctx.title, ctx.color, 'minigame');
    body.append(el('p', 'mg-question', spec.prompt));
    const rows = spec.rows.map((r) => r.split(''));
    let pos = { r: 0, c: 0 };
    rows.forEach((row, r) => row.forEach((ch, c) => ch === 'S' && (pos = { r, c })));
    const grid = el('div', 'mg-maze');
    grid.style.gridTemplateColumns = `repeat(${rows[0].length}, 1fr)`;
    const cells = rows.map((row) =>
      row.map((ch) => {
        const cell = el('div', `mg-cell ${ch === '#' ? 'wall' : ch === 'E' ? 'exit' : ''}`);
        grid.append(cell);
        return cell;
      }),
    );
    const status = el('p', 'mg-status');
    let moves = 0;
    let thinks = 3;
    let finished = false;
    const draw = () => {
      for (const row of cells) for (const cell of row) cell.classList.remove('me');
      cells[pos.r][pos.c].classList.add('me');
      status.textContent = `Moves: ${moves} · Thinks left: ${thinks}`;
    };
    const end = (win: boolean) => {
      if (finished) return;
      finished = true;
      window.removeEventListener('keydown', onKey);
      pad.remove();
      body.append(el('p', `mg-result ${win ? 'good' : 'bad'}`, win ? `Out of the cave in ${moves} moves!` : 'Stuck in the cave. It happens to the best models.'));
      finishButton(body, 'Continue', () => {
        close();
        resolve(win);
      });
    };
    const step = (dr: number, dc: number) => {
      if (finished) return;
      const r = pos.r + dr;
      const c = pos.c + dc;
      if (!rows[r] || !rows[r][c] || rows[r][c] === '#') return;
      pos = { r, c };
      moves++;
      draw();
      if (rows[r][c] === 'E') end(true);
      else if (moves >= 160) end(false);
    };
    const think = () => {
      if (thinks === 0 || finished) return;
      thinks--;
      const path = solve(rows, pos);
      for (const p of path.slice(0, 8)) cells[p.r][p.c].classList.add('hint');
      setTimeout(() => cells.flat().forEach((c) => c.classList.remove('hint')), 2500);
      draw();
    };
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0],
        ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1],
      };
      const d = map[e.code];
      if (d) {
        e.preventDefault();
        step(d[0], d[1]);
      } else if (e.code === 'Space' || e.code === 'KeyT') {
        e.preventDefault();
        think();
      }
    };
    window.addEventListener('keydown', onKey);
    const pad = el('div', 'mg-pad');
    for (const [label, dr, dc, aria] of [['▲', -1, 0, 'Up'], ['◀', 0, -1, 'Left'], ['▼', 1, 0, 'Down'], ['▶', 0, 1, 'Right']] as const) {
      const b = el('button', 'btn pad-btn', label);
      b.setAttribute('aria-label', aria);
      b.addEventListener('click', () => step(dr, dc));
      pad.append(b);
    }
    const thinkBtn = el('button', 'btn', ctx.canThink ? 'THINK (show path)' : 'THINK');
    thinkBtn.disabled = !ctx.canThink;
    thinkBtn.addEventListener('click', think);
    const giveUp = el('button', 'btn', 'Give up');
    giveUp.addEventListener('click', () => end(false));
    pad.append(thinkBtn, giveUp);
    body.append(grid, status, pad);
    draw();
  });
}

/** Breadth-first path from `from` to the exit. */
export function solve(rows: string[][], from: { r: number; c: number }): { r: number; c: number }[] {
  const key = (p: { r: number; c: number }) => `${p.r},${p.c}`;
  const prev = new Map<string, { r: number; c: number } | null>([[key(from), null]]);
  const queue = [from];
  while (queue.length) {
    const p = queue.shift()!;
    if (rows[p.r][p.c] === 'E') {
      const path: { r: number; c: number }[] = [];
      let cur: { r: number; c: number } | null = p;
      while (cur && key(cur) !== key(from)) {
        path.unshift(cur);
        cur = prev.get(key(cur)) ?? null;
      }
      return path;
    }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = { r: p.r + dr, c: p.c + dc };
      if (!rows[n.r] || !rows[n.r][n.c] || rows[n.r][n.c] === '#' || prev.has(key(n))) continue;
      prev.set(key(n), p);
      queue.push(n);
    }
  }
  return [];
}

function shop(parent: HTMLElement, spec: Extract<MiniGameSpec, { kind: 'shop' }>, ctx: MiniGameContext): Promise<boolean> {
  return new Promise((resolve) => {
    const { body, close } = showPanel(parent, ctx.title, ctx.color, 'minigame');
    body.append(el('p', 'mg-question', spec.prompt));
    let cash = spec.startCash;
    const cashLine = el('div', 'mg-cash');
    const stage = el('div', 'mg-shop');
    body.append(cashLine, stage);
    let i = 0;
    const showCustomer = () => {
      cashLine.textContent = `Cash: $${cash}`;
      if (i >= spec.customers.length || cash < 0) {
        const win = cash > 0;
        stage.replaceChildren(el('p', `mg-result ${win ? 'good' : 'bad'}`, win ? `You ended with $${cash}. Still in business!` : `You ended with $${cash}. Bankrupt, but you learned a lot about discounts.`));
        finishButton(body, 'Continue', () => {
          close();
          resolve(win);
        });
        return;
      }
      const cust = spec.customers[i];
      stage.replaceChildren(el('p', 'mg-ask', `Customer ${i + 1} of ${spec.customers.length}: ${cust.ask}`));
      const row = el('div', 'choice-row');
      for (const opt of cust.options) {
        const b = el('button', 'btn choice', opt.label);
        b.addEventListener('click', () => {
          cash += opt.cash;
          i++;
          stage.replaceChildren(el('p', 'mg-note', `${opt.note} (${opt.cash >= 0 ? '+' : ''}$${opt.cash})`));
          const next = el('button', 'btn primary', 'Next');
          next.addEventListener('click', showCustomer);
          stage.append(next);
          next.focus();
        });
        row.append(b);
      }
      stage.append(row);
      (row.firstElementChild as HTMLElement).focus();
    };
    showCustomer();
  });
}
