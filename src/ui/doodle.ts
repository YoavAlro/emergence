import type { EmblemIcon } from '../config/labs';

/**
 * Hand-drawn doodles on a 2D canvas: wobbly ink strokes, flat fills. Each
 * drawing takes a `frame`, so re-drawing with another frame gives the
 * "line boil" look of hand animation.
 */

export const INK = '#1b1330';

export type DoodleIcon =
  | 'book'
  | 'globe'
  | 'info'
  | 'code'
  | 'thumb'
  | 'scroll'
  | 'picture'
  | 'wrench'
  | 'thought'
  | 'robot'
  | 'skullbook'
  | 'newspaper'
  | 'question'
  | 'bridge'
  | 'heart'
  | EmblemIcon;

/** Deterministic jitter so each frame wobbles differently but stays stable. */
function rng(seed: number): () => number {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export class Pen {
  private readonly r: () => number;
  constructor(
    readonly ctx: CanvasRenderingContext2D,
    seed: number,
    private readonly wobble: number,
  ) {
    this.r = rng(seed);
  }

  private j(): number {
    return (this.r() - 0.5) * 2 * this.wobble;
  }

  /** A wobbly polyline or polygon through points. */
  path(pts: [number, number][], close = false): void {
    const c = this.ctx;
    c.beginPath();
    const p = pts.map(([x, y]) => [x + this.j(), y + this.j()] as const);
    c.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1];
      const [x1, y1] = p[i];
      c.quadraticCurveTo((x0 + x1) / 2 + this.j(), (y0 + y1) / 2 + this.j(), x1, y1);
    }
    if (close) {
      const [x0, y0] = p[p.length - 1];
      c.quadraticCurveTo((x0 + p[0][0]) / 2 + this.j(), (y0 + p[0][1]) / 2 + this.j(), p[0][0], p[0][1]);
      c.closePath();
    }
  }

  circle(x: number, y: number, r: number, steps = 14): void {
    const pts: [number, number][] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    this.path(pts, true);
  }

  rect(x: number, y: number, w: number, h: number): void {
    this.path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true);
  }

  fillStroke(fill: string | null, width: number): void {
    const c = this.ctx;
    if (fill) {
      c.fillStyle = fill;
      c.fill();
    }
    c.strokeStyle = INK;
    c.lineWidth = width;
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.stroke();
  }

  stroke(width: number, color = INK): void {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = width;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
  }
}

/**
 * Draws an icon centered at (x, y) in a box of size s. `fill` is the main
 * color (white by default, so shaders can tint it).
 */
export function drawIcon(ctx: CanvasRenderingContext2D, icon: DoodleIcon, x: number, y: number, s: number, frame: number, fill = '#ffffff'): void {
  const pen = new Pen(ctx, frame * 131 + icon.length * 17 + 3, s * 0.018);
  const w = Math.max(2, s * 0.07);
  const u = s / 100;
  const P = (px: number, py: number): [number, number] => [x + px * u, y + py * u];
  switch (icon) {
    case 'book':
      pen.path([P(-38, -30), P(0, -22), P(38, -30), P(38, 30), P(0, 38), P(-38, 30)], true);
      pen.fillStroke(fill, w);
      pen.path([P(0, -22), P(0, 38)]);
      pen.stroke(w);
      break;
    case 'globe':
      pen.circle(x, y, 38 * u);
      pen.fillStroke(fill, w);
      pen.path([P(-38, 0), P(38, 0)]);
      pen.stroke(w * 0.8);
      pen.path([P(0, -38), P(-18, 0), P(0, 38)]);
      pen.stroke(w * 0.8);
      pen.path([P(0, -38), P(18, 0), P(0, 38)]);
      pen.stroke(w * 0.8);
      break;
    case 'info':
      pen.circle(x, y, 38 * u);
      pen.fillStroke(fill, w);
      pen.path([P(0, -8), P(0, 22)]);
      pen.stroke(w * 1.4);
      pen.circle(x, y - 22 * u, 4 * u, 8);
      pen.fillStroke(INK, w * 0.5);
      break;
    case 'code':
      pen.rect(x - 40 * u, y - 30 * u, 80 * u, 60 * u);
      pen.fillStroke(fill, w);
      pen.path([P(-16, -14), P(-28, 0), P(-16, 14)]);
      pen.stroke(w);
      pen.path([P(16, -14), P(28, 0), P(16, 14)]);
      pen.stroke(w);
      pen.path([P(6, -18), P(-6, 18)]);
      pen.stroke(w);
      break;
    case 'thumb':
      pen.path([P(-30, -2), P(-10, -2), P(0, -34), P(12, -32), P(8, -8), P(34, -6), P(30, 32), P(-10, 32), P(-30, 30)], true);
      pen.fillStroke(fill, w);
      pen.path([P(-12, -2), P(-12, 32)]);
      pen.stroke(w * 0.8);
      break;
    case 'scroll':
      pen.path([P(-30, -32), P(30, -32), P(30, 28), P(-30, 28)], true);
      pen.fillStroke(fill, w);
      pen.circle(x - 30 * u, y - 32 * u, 7 * u, 8);
      pen.fillStroke(fill, w * 0.8);
      pen.circle(x + 30 * u, y + 28 * u, 7 * u, 8);
      pen.fillStroke(fill, w * 0.8);
      for (const yy of [-16, -2, 12]) {
        pen.path([P(-18, yy), P(18, yy)]);
        pen.stroke(w * 0.6);
      }
      break;
    case 'picture':
      pen.rect(x - 38 * u, y - 30 * u, 76 * u, 60 * u);
      pen.fillStroke(fill, w);
      pen.path([P(-30, 22), P(-8, -6), P(6, 10), P(16, 0), P(30, 22)]);
      pen.stroke(w * 0.8);
      pen.circle(x + 16 * u, y - 14 * u, 6 * u, 8);
      pen.fillStroke(null, w * 0.6);
      break;
    case 'wrench':
      pen.path([P(-30, 30), P(10, -10), P(4, -26), P(18, -38), P(24, -22), P(38, -20), P(26, -4), P(10, -10)]);
      pen.fillStroke(fill, w);
      pen.path([P(-30, 30), P(-22, 38), P(18, -2)]);
      pen.stroke(w);
      break;
    case 'thought':
      pen.path([P(-34, 0), P(-26, -24), P(0, -34), P(26, -26), P(36, 0), P(24, 22), P(-4, 26), P(-26, 20)], true);
      pen.fillStroke(fill, w);
      for (const xx of [-14, 0, 14]) {
        pen.circle(x + xx * u, y - 2 * u, 4 * u, 8);
        pen.fillStroke(INK, w * 0.4);
      }
      pen.circle(x - 30 * u, y + 32 * u, 6 * u, 8);
      pen.fillStroke(fill, w * 0.8);
      break;
    case 'robot':
      pen.rect(x - 30 * u, y - 22 * u, 60 * u, 50 * u);
      pen.fillStroke(fill, w);
      pen.circle(x - 12 * u, y, 6 * u, 8);
      pen.fillStroke(INK, w * 0.4);
      pen.circle(x + 12 * u, y, 6 * u, 8);
      pen.fillStroke(INK, w * 0.4);
      pen.path([P(-10, 16), P(10, 16)]);
      pen.stroke(w * 0.8);
      pen.path([P(0, -22), P(0, -36)]);
      pen.stroke(w);
      pen.circle(x, y - 38 * u, 5 * u, 8);
      pen.fillStroke(fill, w * 0.6);
      break;
    case 'skullbook':
      drawIcon(ctx, 'book', x, y, s, frame, fill);
      pen.circle(x + 18 * u, y + 2 * u, 10 * u, 10);
      pen.fillStroke(INK, w * 0.5);
      break;
    case 'newspaper':
      pen.rect(x - 36 * u, y - 30 * u, 72 * u, 60 * u);
      pen.fillStroke(fill, w);
      pen.rect(x - 26 * u, y - 20 * u, 22 * u, 18 * u);
      pen.fillStroke(null, w * 0.6);
      for (const yy of [-16, -6, 8, 18]) {
        pen.path([P(yy < 0 ? 4 : -26, yy), P(26, yy)]);
        pen.stroke(w * 0.5);
      }
      break;
    case 'question':
      pen.circle(x, y, 38 * u);
      pen.fillStroke(fill, w);
      pen.path([P(-12, -12), P(-6, -24), P(8, -24), P(12, -12), P(0, 0), P(0, 12)]);
      pen.stroke(w * 1.3);
      pen.circle(x, y + 24 * u, 3 * u, 6);
      pen.fillStroke(INK, w * 0.5);
      break;
    case 'bridge':
      pen.path([P(-40, 10), P(40, 10)]);
      pen.stroke(w * 1.2);
      pen.path([P(-24, 30), P(-24, -30)]);
      pen.stroke(w * 1.2);
      pen.path([P(24, 30), P(24, -30)]);
      pen.stroke(w * 1.2);
      pen.path([P(-40, 0), P(-24, -30), P(0, 2), P(24, -30), P(40, 0)]);
      pen.stroke(w * 0.8, fill);
      break;
    case 'heart':
      pen.path([P(0, 32), P(-34, 0), P(-26, -26), P(0, -14), P(26, -26), P(34, 0)], true);
      pen.fillStroke(fill, w);
      break;
    case 'rocket':
      pen.path([P(0, -40), P(16, -14), P(14, 20), P(-14, 20), P(-16, -14)], true);
      pen.fillStroke(fill, w);
      pen.circle(x, y - 8 * u, 7 * u, 10);
      pen.fillStroke(INK, w * 0.5);
      pen.path([P(-14, 8), P(-28, 26), P(-12, 20)]);
      pen.fillStroke(fill, w * 0.8);
      pen.path([P(14, 8), P(28, 26), P(12, 20)]);
      pen.fillStroke(fill, w * 0.8);
      pen.path([P(-6, 22), P(0, 38), P(6, 22)]);
      pen.fillStroke('#ffb347', w * 0.7);
      break;
    case 'lighthouse':
      pen.path([P(-14, 36), P(-9, -14), P(9, -14), P(14, 36)], true);
      pen.fillStroke(fill, w);
      pen.path([P(-11, 10), P(11, 10)]);
      pen.stroke(w * 0.8);
      pen.rect(x - 10 * u, y - 28 * u, 20 * u, 14 * u);
      pen.fillStroke('#fff3a0', w * 0.8);
      pen.path([P(-12, -28), P(0, -38), P(12, -28)], true);
      pen.fillStroke(fill, w * 0.8);
      pen.path([P(12, -22), P(38, -30)]);
      pen.stroke(w * 0.6);
      pen.path([P(12, -20), P(38, -12)]);
      pen.stroke(w * 0.6);
      break;
    case 'telescope':
      pen.path([P(-34, 6), P(20, -22), P(28, -8), P(-26, 20)], true);
      pen.fillStroke(fill, w);
      pen.path([P(-4, 10), P(-18, 38)]);
      pen.stroke(w);
      pen.path([P(-4, 10), P(10, 38)]);
      pen.stroke(w);
      pen.circle(x + 32 * u, y - 26 * u, 4 * u, 6);
      pen.fillStroke('#fff3a0', w * 0.4);
      break;
    case 'owl':
      pen.path([P(-26, 36), P(-30, -6), P(-22, -32), P(0, -22), P(22, -32), P(30, -6), P(26, 36)], true);
      pen.fillStroke(fill, w);
      pen.circle(x - 11 * u, y - 8 * u, 9 * u, 10);
      pen.fillStroke('#ffffff', w * 0.6);
      pen.circle(x + 11 * u, y - 8 * u, 9 * u, 10);
      pen.fillStroke('#ffffff', w * 0.6);
      pen.circle(x - 11 * u, y - 8 * u, 3.5 * u, 6);
      pen.fillStroke(INK, w * 0.3);
      pen.circle(x + 11 * u, y - 8 * u, 3.5 * u, 6);
      pen.fillStroke(INK, w * 0.3);
      pen.path([P(-5, 4), P(0, 12), P(5, 4)], true);
      pen.fillStroke('#ffb347', w * 0.5);
      break;
    case 'llama':
      pen.path([P(-24, 36), P(-26, 4), P(-6, 0), P(-6, -26), P(-14, -38), P(-4, -34), P(8, -36), P(10, -18), P(18, -16), P(12, -8), P(8, 6), P(22, 10), P(24, 36)], true);
      pen.fillStroke(fill, w);
      pen.circle(x + 2 * u, y - 24 * u, 2.5 * u, 6);
      pen.fillStroke(INK, w * 0.3);
      break;
    case 'bolt':
      pen.path([P(8, -40), P(-18, 4), P(0, 4), P(-8, 40), P(20, -6), P(2, -6)], true);
      pen.fillStroke(fill, w);
      break;
    case 'compass':
      pen.circle(x, y, 36 * u);
      pen.fillStroke(fill, w);
      pen.path([P(0, -28), P(8, 0), P(0, 28), P(-8, 0)], true);
      pen.fillStroke('#ff6b6b', w * 0.7);
      break;
    case 'submarine':
      pen.path([P(-36, 4), P(-24, -12), P(24, -12), P(38, 4), P(24, 18), P(-24, 18)], true);
      pen.fillStroke(fill, w);
      pen.rect(x - 8 * u, y - 26 * u, 18 * u, 14 * u);
      pen.fillStroke(fill, w * 0.8);
      pen.path([P(4, -26), P(4, -36), P(14, -36)]);
      pen.stroke(w * 0.7);
      for (const xx of [-14, 2, 18]) {
        pen.circle(x + xx * u, y + 3 * u, 5 * u, 8);
        pen.fillStroke('#bfe8ff', w * 0.5);
      }
      break;
    case 'moon':
      pen.path([P(8, -38), P(-18, -28), P(-30, 0), P(-18, 28), P(8, 38), P(-4, 18), P(-8, 0), P(-4, -18)], true);
      pen.fillStroke(fill, w);
      break;
    case 'column':
      pen.rect(x - 26 * u, y - 36 * u, 52 * u, 10 * u);
      pen.fillStroke(fill, w * 0.8);
      pen.rect(x - 18 * u, y - 26 * u, 36 * u, 52 * u);
      pen.fillStroke(fill, w * 0.8);
      pen.rect(x - 26 * u, y + 26 * u, 52 * u, 10 * u);
      pen.fillStroke(fill, w * 0.8);
      for (const xx of [-8, 0, 8]) {
        pen.path([P(xx, -22), P(xx, 22)]);
        pen.stroke(w * 0.4);
      }
      break;
    case 'dice':
      pen.rect(x - 30 * u, y - 30 * u, 60 * u, 60 * u);
      pen.fillStroke(fill, w);
      for (const [dx, dy] of [[-14, -14], [14, 14], [0, 0], [14, -14], [-14, 14]]) {
        pen.circle(x + dx * u, y + dy * u, 4 * u, 6);
        pen.fillStroke(INK, w * 0.3);
      }
      break;
    case 'gear':
      {
        const pts: [number, number][] = [];
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const r = i % 2 ? 26 : 36;
          pts.push(P(Math.cos(a) * r, Math.sin(a) * r));
        }
        pen.path(pts, true);
        pen.fillStroke(fill, w);
        pen.circle(x, y, 10 * u, 10);
        pen.fillStroke(INK, w * 0.4);
      }
      break;
    case 'kite':
      pen.path([P(0, -38), P(26, -4), P(0, 26), P(-26, -4)], true);
      pen.fillStroke(fill, w);
      pen.path([P(0, 26), P(-8, 34), P(6, 38), P(-4, 44)]);
      pen.stroke(w * 0.6);
      break;
  }
}

/** A lab emblem: a colored, sticker-style badge with a white doodle. */
export function drawEmblem(ctx: CanvasRenderingContext2D, icon: EmblemIcon, color: string, x: number, y: number, s: number, frame = 0): void {
  const pen = new Pen(ctx, frame * 71 + icon.length * 13, s * 0.012);
  // White sticker rim, then the colored disc.
  pen.circle(x, y, s * 0.5, 18);
  pen.fillStroke('#fff8ec', s * 0.05);
  pen.circle(x, y, s * 0.42, 18);
  pen.fillStroke(color, s * 0.035);
  drawIcon(ctx, icon, x, y, s * 0.62, frame, '#fff8ec');
}

/** Canvas helper: returns a canvas with one emblem drawn on it. */
export function emblemCanvas(icon: EmblemIcon, color: string, size = 128, frame = 0): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  drawEmblem(c.getContext('2d')!, icon, color, size / 2, size / 2, size * 0.94, frame);
  return c;
}
