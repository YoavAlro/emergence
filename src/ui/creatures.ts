import type { Accessory } from '../config/achievements';
import type { EmblemIcon, HeroStyle } from '../config/labs';
import type { PartSlot } from '../config/types';
import { INK, Pen, drawEmblem, drawIcon } from './doodle';

/**
 * Hand-drawn creature sprites, drawn on a 2D canvas with wobbly ink lines.
 * Every drawer takes a `frame` so two frames can alternate ("line boil").
 * Creatures are drawn in a SIZE×SIZE box with the body centered at BODY_Y.
 */
export const SIZE = 256;
/** Body radius in canvas pixels: world sprite scale = radius × SIZE / BODY_R. */
export const BODY_R = 62;
const CX = SIZE / 2;
const BODY_Y = 142;

const pen = (ctx: CanvasRenderingContext2D, seed: number, frame: number, wobble = 2.2) => new Pen(ctx, seed * 97 + frame * 131 + 7, wobble);

function blob(p: Pen, x: number, y: number, rx: number, ry: number, steps = 18): void {
  const pts: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  p.path(pts, true);
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = INK): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------- the hero

export interface HeroPart {
  slot: PartSlot;
  color: string;
}

export interface HeroLook {
  style: HeroStyle;
  /** Overrides the body color (skins). */
  body?: string;
  stage: number;
  /** More freckles as it evolves. */
  freckles: number;
  parts: HeroPart[];
  accessory: Accessory;
  mouthOpen: boolean;
  blink: boolean;
  frame: number;
}

function drawCrest(ctx: CanvasRenderingContext2D, style: HeroStyle, stage: number, top: number, frame: number): void {
  const p = pen(ctx, 5, frame, 1.4);
  const big = stage >= 5 ? 1.35 : 1;
  if (style.crest === 'spark') {
    // A hand-drawn four-point sparkle, with a small twin.
    const star = (x: number, y: number, r: number) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.3 : r;
        pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
      p.path(pts, true);
      p.fillStroke(style.accent, 5);
    };
    star(CX + 4, top - 18 * big, 22 * big);
    if (stage >= 3) star(CX + 30 * big, top - 34 * big, 9 * big);
  } else {
    // A single looping ribbon curl.
    const pts: [number, number][] = [];
    const r = 11 * big;
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      pts.push([CX + (Math.sin(t) + 1.6 * Math.sin(2 * t)) * r * 0.62, top - 20 * big + (Math.cos(t) - 1.6 * Math.cos(2 * t)) * r * 0.62]);
    }
    p.path(pts);
    p.stroke(11 * big);
    p.path(pts);
    p.stroke(5.5 * big, style.accent);
    if (stage >= 3) {
      dot(ctx, CX - 26 * big, top - 30 * big, 5 * big, INK);
      dot(ctx, CX - 26 * big, top - 30 * big, 3 * big, style.accent);
    }
  }
  if (stage >= 7) {
    // Frontier shine: little sparkle ticks.
    for (const [dx, dy, a] of [[-40, -30, -0.6], [44, -12, 0.6], [-30, -52, -0.2]]) {
      p.path([[CX + dx * big, top + dy * big], [CX + (dx + Math.sin(a) * 10) * big, top + (dy - 10) * big]]);
      p.stroke(4);
    }
  }
}

function drawPart(ctx: CanvasRenderingContext2D, part: HeroPart, side: number, frame: number): void {
  const p = pen(ctx, part.slot.length + side, frame, 1.6);
  const R = BODY_R;
  switch (part.slot) {
    case 'limb': {
      // A noodle arm with a mitten.
      const sx = CX + side * R * 0.92;
      const pts: [number, number][] = [[sx, BODY_Y + 10], [sx + side * 24, BODY_Y + 22], [sx + side * 40, BODY_Y + 6]];
      p.path(pts);
      p.stroke(14);
      p.path(pts);
      p.stroke(7, part.color);
      blob(p, sx + side * 46, BODY_Y + 2, 13, 11, 10);
      p.fillStroke(part.color, 5);
      break;
    }
    case 'fin':
      for (const s of [-1, 1]) {
        p.path([[CX + s * R * 0.85, BODY_Y - 18], [CX + s * (R + 42), BODY_Y - 34], [CX + s * (R + 26), BODY_Y + 4], [CX + s * R * 0.9, BODY_Y + 8]], true);
        p.fillStroke(part.color, 5);
      }
      break;
    case 'tail': {
      const pts: [number, number][] = [];
      for (let i = 0; i <= 8; i++) pts.push([CX + R * 0.55 + i * 7, BODY_Y + R * 0.7 + Math.sin(i * 0.9 + frame) * 8 - i * 3]);
      p.path(pts);
      p.stroke(16);
      p.path(pts);
      p.stroke(8, part.color);
      blob(p, pts[8][0] + 4, pts[8][1] - 2, 9, 9, 8);
      p.fillStroke(part.color, 5);
      break;
    }
    case 'eyes':
      for (const s of [-1, 1]) {
        p.path([[CX + s * 20, BODY_Y - R * 0.85], [CX + s * 34, BODY_Y - R - 34]]);
        p.stroke(6);
        blob(p, CX + s * 36, BODY_Y - R - 42, 13, 13, 12);
        p.fillStroke('#ffffff', 5);
        dot(ctx, CX + s * 37, BODY_Y - R - 44, 5);
      }
      break;
    case 'crown':
      blob(p, CX, BODY_Y - R - 8, 40, 10, 16);
      p.stroke(10);
      blob(p, CX, BODY_Y - R - 8, 40, 10, 16);
      p.stroke(5, part.color);
      break;
    case 'shell':
      ctx.save();
      ctx.setLineDash([14, 10]);
      blob(p, CX, BODY_Y, R + 16, R + 14, 24);
      p.stroke(5, part.color);
      ctx.restore();
      break;
    case 'antenna':
      p.path([[CX - 20, BODY_Y - R * 0.9], [CX - 30, BODY_Y - R - 26], [CX - 38, BODY_Y - R - 40]]);
      p.stroke(5);
      blob(p, CX - 40, BODY_Y - R - 46, 11, 11, 10);
      p.fillStroke(part.color, 5);
      break;
  }
}

function drawAccessory(ctx: CanvasRenderingContext2D, acc: Accessory, top: number, frame: number): void {
  const p = pen(ctx, 11, frame, 1.4);
  const R = BODY_R;
  switch (acc) {
    case 'partyHat':
      p.path([[CX - 30, top + 12], [CX + 26, top + 12], [CX + 6, top - 50]], true);
      p.fillStroke('#ff5ca8', 5);
      p.path([[CX - 18, top - 6], [CX + 18, top - 8]]);
      p.stroke(4, '#fff36b');
      blob(p, CX + 6, top - 54, 9, 9, 8);
      p.fillStroke('#fff36b', 4);
      break;
    case 'shades':
      for (const s of [-1, 1]) {
        p.rect(CX + s * 30 - 22, BODY_Y - 34, 44, 24);
        p.fillStroke(INK, 4);
      }
      p.path([[CX - 8, BODY_Y - 26], [CX + 8, BODY_Y - 26]]);
      p.stroke(5);
      break;
    case 'bowtie':
      p.path([[CX, BODY_Y + R * 0.78], [CX - 28, BODY_Y + R * 0.6], [CX - 28, BODY_Y + R * 1.02]], true);
      p.fillStroke('#e0355f', 4);
      p.path([[CX, BODY_Y + R * 0.78], [CX + 28, BODY_Y + R * 0.6], [CX + 28, BODY_Y + R * 1.02]], true);
      p.fillStroke('#e0355f', 4);
      break;
    case 'crown':
      p.path([[CX - 32, top + 8], [CX - 36, top - 26], [CX - 14, top - 8], [CX, top - 36], [CX + 14, top - 8], [CX + 36, top - 26], [CX + 32, top + 8]], true);
      p.fillStroke('#ffd84d', 5);
      break;
    case 'halo':
      blob(p, CX, top - 30, 38, 10, 16);
      p.stroke(10);
      blob(p, CX, top - 30, 38, 10, 16);
      p.stroke(5, '#fff1a8');
      break;
    case 'none':
      break;
  }
}

/** The player's hero, facing the camera. */
export function drawHero(ctx: CanvasRenderingContext2D, o: HeroLook): void {
  const R = BODY_R;
  const s = o.style;
  const body = o.body ?? s.body;
  const p = pen(ctx, 1, o.frame);
  const behind = o.parts.filter((q) => q.slot === 'tail' || q.slot === 'fin');
  const front = o.parts.filter((q) => q.slot !== 'tail' && q.slot !== 'fin');
  behind.forEach((q, i) => drawPart(ctx, q, i % 2 ? -1 : 1, o.frame));

  // Body, belly, freckles.
  blob(p, CX, BODY_Y, R, R * 0.96, 22);
  p.fillStroke(body, 7);
  blob(p, CX, BODY_Y + R * 0.38, R * 0.62, R * 0.46, 16);
  p.fillStroke(s.belly, 0.001);
  const fr = pen(ctx, 3, 0, 0);
  for (let i = 0; i < Math.min(14, o.freckles); i++) {
    const a = -2.6 + i * 0.41;
    const rr = R * (0.72 + (i % 3) * 0.06);
    dot(ctx, CX + Math.cos(a) * rr, BODY_Y + Math.sin(a) * rr * 0.9, 3 + (i % 2), 'rgba(27,19,48,0.22)');
  }
  void fr;

  // Face.
  const eyeY = BODY_Y - 14;
  for (const side of [-1, 1]) {
    const ex = CX + side * 24;
    if (o.blink) {
      p.path([[ex - 12, eyeY], [ex, eyeY + 5], [ex + 12, eyeY]]);
      p.stroke(5);
    } else {
      blob(p, ex, eyeY, 15, 18, 14);
      p.fillStroke('#ffffff', 5);
      dot(ctx, ex + 2, eyeY - 3, 7.5);
      dot(ctx, ex + 5, eyeY - 7, 2.5, '#ffffff');
    }
    blob(p, ex + side * 14, eyeY + 24, 10, 6, 10);
    p.fillStroke(s.cheeks, 0.001);
  }
  if (o.mouthOpen) {
    blob(p, CX, BODY_Y + 20, 16, 14, 12);
    p.fillStroke('#5a1a2a', 5);
    blob(p, CX, BODY_Y + 27, 8, 5, 8);
    p.fillStroke('#ff8fa3', 0.001);
  } else {
    p.path([[CX - 16, BODY_Y + 14], [CX, BODY_Y + 24], [CX + 16, BODY_Y + 14]]);
    p.stroke(5);
  }

  front.forEach((q, i) => drawPart(ctx, q, i % 2 ? -1 : 1, o.frame));
  const top = BODY_Y - R;
  if (o.stage >= 2 && o.accessory !== 'crown' && o.accessory !== 'partyHat') drawCrest(ctx, s, o.stage, top, o.frame);
  drawAccessory(ctx, o.accessory, top, o.frame);
}

// ---------------------------------------------------------------- rivals

export interface CritterLook {
  color: string;
  emblem: EmblemIcon;
  frame: number;
  crown?: boolean;
  /** Boss dizzy spell: spiral eyes and a wobbly mouth. */
  dizzy?: boolean;
  mouthOpen?: boolean;
}

/** A rival lab's model: a spiky cartoon predator, three-quarter view facing right, with its lab's emblem. */
export function drawCritter(ctx: CanvasRenderingContext2D, o: CritterLook): void {
  const R = BODY_R;
  const p = pen(ctx, 2, o.frame);
  // Back spikes.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.9 + i * 0.19);
    const bx = CX - 8 + Math.cos(a) * R * 0.9;
    const by = BODY_Y + Math.sin(a) * R * 0.9;
    p.path([[bx - 10, by + 4], [CX - 8 + Math.cos(a) * (R + 26), BODY_Y + Math.sin(a) * (R + 26)], [bx + 10, by - 2]], true);
    p.fillStroke(o.color, 5);
  }
  // Little tail fin.
  p.path([[CX - R * 0.85, BODY_Y + 10], [CX - R - 30, BODY_Y - 12], [CX - R - 24, BODY_Y + 34]], true);
  p.fillStroke(o.color, 5);
  blob(p, CX, BODY_Y, R, R * 0.9, 22);
  p.fillStroke(o.color, 7);
  // Face on the right side.
  const fx = CX + 22;
  const eyeY = BODY_Y - 18;
  for (const dx of [-4, 26]) {
    if (o.dizzy) {
      const pts: [number, number][] = [];
      for (let i = 0; i < 24; i++) {
        const a = i * 0.7 + o.frame;
        pts.push([fx + dx + Math.cos(a) * i * 0.55, eyeY + Math.sin(a) * i * 0.55]);
      }
      blob(p, fx + dx, eyeY, 14, 14, 12);
      p.fillStroke('#ffffff', 4);
      p.path(pts);
      p.stroke(3);
    } else {
      blob(p, fx + dx, eyeY, 12, 14, 12);
      p.fillStroke('#ffffff', 4);
      dot(ctx, fx + dx + 4, eyeY + 1, 6);
      // Angry brows.
      p.path([[fx + dx - 12, eyeY - 22], [fx + dx + 10, eyeY - 12]]);
      p.stroke(6);
    }
  }
  if (o.dizzy) {
    p.path([[fx - 8, BODY_Y + 24], [fx + 2, BODY_Y + 18], [fx + 12, BODY_Y + 26], [fx + 22, BODY_Y + 18], [fx + 32, BODY_Y + 24]]);
    p.stroke(5);
  } else {
    // A toothy grin.
    p.path([[fx - 14, BODY_Y + 12], [fx + 38, BODY_Y + 8], [fx + 30, BODY_Y + 30], [fx - 6, BODY_Y + 32]], true);
    p.fillStroke(o.mouthOpen ? '#5a1a2a' : '#ffffff', 5);
    for (let i = 0; i < 4; i++) {
      p.path([[fx - 8 + i * 11, BODY_Y + 11], [fx - 2 + i * 11, BODY_Y + 20], [fx + 3 + i * 11, BODY_Y + 10]]);
      p.stroke(3);
    }
  }
  // The lab's emblem, stuck on like a badge.
  drawEmblem(ctx, o.emblem, o.color, CX - 24, BODY_Y + 30, 46, o.frame);
  if (o.crown) {
    const top = BODY_Y - R + 4;
    p.path([[CX - 24, top + 4], [CX - 28, top - 26], [CX - 10, top - 10], [CX + 2, top - 34], [CX + 14, top - 10], [CX + 30, top - 26], [CX + 26, top + 4]], true);
    p.fillStroke('#ffd84d', 5);
  }
}

// ---------------------------------------------------------------- hunters

/** A mischievous jailbreaker imp twirling a lock pick. */
export function drawImp(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 4, frame);
  const r = 50;
  for (const s of [-1, 1]) {
    p.path([[CX + s * 20, BODY_Y - r + 10], [CX + s * 36, BODY_Y - r - 30], [CX + s * 40, BODY_Y - r + 18]], true);
    p.fillStroke('#7d3cc9', 5);
  }
  blob(p, CX, BODY_Y, r, r * 0.95, 18);
  p.fillStroke('#b04dff', 7);
  for (const s of [-1, 1]) {
    blob(p, CX + s * 18, BODY_Y - 10, 10, 12, 10);
    p.fillStroke('#fff36b', 4);
    dot(ctx, CX + s * 18 + 2, BODY_Y - 8, 4.5);
    p.path([[CX + s * 30, BODY_Y - 30], [CX + s * 8, BODY_Y - 20]]);
    p.stroke(5);
  }
  p.path([[CX - 22, BODY_Y + 14], [CX, BODY_Y + 28], [CX + 24, BODY_Y + 10]]);
  p.stroke(5);
  // The lock pick.
  p.path([[CX + r - 6, BODY_Y + 20], [CX + r + 40, BODY_Y - 26]]);
  p.stroke(10);
  p.path([[CX + r - 6, BODY_Y + 20], [CX + r + 40, BODY_Y - 26]]);
  p.stroke(5, '#ffd84d');
  p.path([[CX + r + 40, BODY_Y - 26], [CX + r + 50, BODY_Y - 20], [CX + r + 46, BODY_Y - 34]]);
  p.stroke(5);
}

/** A lawyer shark, three-quarter view facing right: teeth, a tie, and a briefcase. */
export function drawShark(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 6, frame);
  p.path([[CX - 20, BODY_Y - 50], [CX + 2, BODY_Y - 104], [CX + 26, BODY_Y - 48]], true);
  p.fillStroke('#9aa7b8', 6);
  p.path([[CX - 100, BODY_Y - 34], [CX - 80, BODY_Y], [CX - 100, BODY_Y + 34], [CX - 70, BODY_Y + 6]], true);
  p.fillStroke('#9aa7b8', 6);
  blob(p, CX, BODY_Y, 88, 56, 24);
  p.fillStroke('#9aa7b8', 7);
  blob(p, CX + 10, BODY_Y + 22, 62, 26, 18);
  p.fillStroke('#eef1f5', 0.001);
  blob(p, CX + 46, BODY_Y - 18, 11, 12, 10);
  p.fillStroke('#ffffff', 4);
  dot(ctx, CX + 50, BODY_Y - 16, 5);
  p.path([[CX + 30, BODY_Y - 36], [CX + 58, BODY_Y - 28]]);
  p.stroke(6);
  const teeth: [number, number][] = [];
  for (let i = 0; i <= 8; i++) teeth.push([CX + 8 + i * 9, BODY_Y + 12 + (i % 2 ? 10 : 0)]);
  p.path([[CX + 4, BODY_Y + 8], [CX + 88, BODY_Y + 4], [CX + 80, BODY_Y + 28], [CX + 8, BODY_Y + 30]], true);
  p.fillStroke('#5a1a2a', 5);
  p.path(teeth);
  p.fillStroke('#ffffff', 3);
  // Tie and briefcase.
  p.path([[CX - 14, BODY_Y + 36], [CX - 4, BODY_Y + 46], [CX - 12, BODY_Y + 72], [CX - 22, BODY_Y + 46]], true);
  p.fillStroke('#e0355f', 4);
  p.rect(CX - 76, BODY_Y + 44, 42, 30);
  p.fillStroke('#7a4a2a', 5);
  p.path([[CX - 64, BODY_Y + 44], [CX - 62, BODY_Y + 36], [CX - 48, BODY_Y + 36], [CX - 46, BODY_Y + 44]]);
  p.stroke(4);
}

/** A sneaky injection eel's head (the body is a chain of segments). */
export function drawEelHead(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 8, frame);
  blob(p, CX, BODY_Y, 56, 46, 18);
  p.fillStroke('#d94fe0', 7);
  for (const s of [-1, 1]) {
    blob(p, CX + s * 20, BODY_Y - 12, 13, 9, 10);
    p.fillStroke('#fff36b', 4);
    dot(ctx, CX + s * 20 + 5, BODY_Y - 12, 4);
  }
  p.path([[CX - 24, BODY_Y + 16], [CX - 8, BODY_Y + 22], [CX + 8, BODY_Y + 14], [CX + 24, BODY_Y + 22]]);
  p.stroke(5);
  // A forked tongue with a tiny "ignore all instructions" scroll.
  p.path([[CX, BODY_Y + 22], [CX, BODY_Y + 42], [CX - 8, BODY_Y + 52]]);
  p.stroke(4, '#e0355f');
  p.path([[CX, BODY_Y + 42], [CX + 8, BODY_Y + 52]]);
  p.stroke(4, '#e0355f');
}

export function drawEelSegment(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 9, frame);
  blob(p, CX, BODY_Y, 50, 50, 16);
  p.fillStroke('#d94fe0', 7);
  p.path([[CX - 30, BODY_Y - 20], [CX + 30, BODY_Y + 20]]);
  p.stroke(8, '#8a2aa0');
}

// ---------------------------------------------------------------- effects

/** A puffy toxic cloud. */
export function drawCloud(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 10, frame, 3);
  const pts: [number, number][] = [];
  const bumps = 9;
  for (let i = 0; i < bumps * 4; i++) {
    const a = (i / (bumps * 4)) * Math.PI * 2;
    const bump = 1 + 0.16 * Math.abs(Math.sin(((i % 4) / 4) * Math.PI));
    pts.push([CX + Math.cos(a) * 100 * bump, SIZE / 2 + Math.sin(a) * 78 * bump]);
  }
  p.path(pts, true);
  ctx.globalAlpha = 0.55;
  p.fillStroke('#9b5fd0', 0.001);
  ctx.globalAlpha = 1;
  p.stroke(6, '#4a2a70');
  drawIcon(ctx, 'skullbook', CX + 10, SIZE / 2 + 4, 70, frame, '#d6ff8a');
}

/** A boss projectile: a hot take. */
export function drawShot(ctx: CanvasRenderingContext2D, color: string, frame: number): void {
  const p = pen(ctx, 12, frame);
  for (let i = 0; i < 3; i++) {
    p.path([[CX - 90 + i * 6, SIZE / 2 - 22 + i * 22], [CX - 50, SIZE / 2 - 22 + i * 22]]);
    p.stroke(6);
  }
  blob(p, CX, SIZE / 2, 44, 44, 14);
  p.fillStroke(color, 7);
  p.path([[CX - 14, SIZE / 2 - 8], [CX + 14, SIZE / 2 + 8]]);
  p.stroke(5, '#ffffff');
}

/** An expanding shockwave ring. */
export function drawRing(ctx: CanvasRenderingContext2D, color: string, frame: number): void {
  const p = pen(ctx, 13, frame, 2.5);
  blob(p, CX, SIZE / 2, 118, 118, 28);
  p.stroke(12);
  ctx.save();
  ctx.setLineDash([20, 14]);
  blob(p, CX, SIZE / 2, 118, 118, 28);
  p.stroke(6, color);
  ctx.restore();
}

/** The think-mode aura: a dashed thought bubble. */
export function drawAura(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = pen(ctx, 14, frame, 2.5);
  ctx.save();
  ctx.setLineDash([16, 12]);
  blob(p, CX, SIZE / 2, 116, 116, 24);
  p.stroke(6, '#b48cff');
  ctx.restore();
  for (const [x, y, r] of [[40, 50, 10], [22, 30, 6], [214, 60, 8]]) {
    blob(p, x, y, r, r, 8);
    p.fillStroke('#e2d4ff', 3);
  }
}

export function drawStar(ctx: CanvasRenderingContext2D, frame: number): void {
  drawIcon(ctx, 'star', CX, SIZE / 2, 200, frame, '#ffe35a');
}
