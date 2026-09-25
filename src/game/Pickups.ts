import * as THREE from 'three';
import type { PickupEffect } from '../config/types';
import { INK, Pen, drawIcon, type DoodleIcon } from '../ui/doodle';
import { hexCss } from './labels';
import { randomInSphere } from './Ocean';

export type PickupShape = 'orb' | 'heart' | 'button' | 'shield' | 'creature' | 'ghost' | 'power';

export interface Pickup {
  sprite: THREE.Sprite;
  label: string;
  effect: PickupEffect;
  /** Set for event pickups: grabbing one counts toward the event objective. */
  eventId: string | null;
  /** Bad pickups count against "avoid" objectives. */
  bad: boolean;
  velocity: THREE.Vector3;
  /** Wanders slowly (ghosts). */
  wander?: THREE.Vector3;
  /** Rides the Current at this parameter. */
  currentU?: number;
  life: number;
}

const textures = new Map<string, THREE.CanvasTexture>();

/** A doodled sticker: wobbly ink shape, flat color, and a hand-lettered label. */
function iconTexture(shape: PickupShape, color: number, label: string, icon?: DoodleIcon): THREE.CanvasTexture {
  const key = `${shape}|${color}|${label}|${icon ?? ''}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const css = hexCss(color);
  const cx = 128;
  const cy = 100;
  const pen = new Pen(ctx, label.length * 13 + shape.length, 2);
  const W = 7;
  if (shape === 'power') {
    // A starburst sticker with the power-up's doodle inside.
    const pts: [number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = i % 2 ? 58 : 72;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    pen.path(pts, true);
    pen.fillStroke('#fff8ec', W);
    drawIcon(ctx, icon ?? 'star', cx, cy, 90, 0, css);
  } else if (shape === 'heart') {
    pen.path([[cx, cy + 44], [cx - 58, cy - 4], [cx - 44, cy - 44], [cx - 12, cy - 44], [cx, cy - 22], [cx + 12, cy - 44], [cx + 44, cy - 44], [cx + 58, cy - 4]], true);
    pen.fillStroke(css, W);
  } else if (shape === 'shield') {
    pen.path([[cx, cy - 52], [cx + 44, cy - 34], [cx + 38, cy + 20], [cx, cy + 52], [cx - 38, cy + 20], [cx - 44, cy - 34]], true);
    pen.fillStroke(css, W);
  } else if (shape === 'button') {
    pen.circle(cx, cy, 52, 20);
    pen.fillStroke(css, W);
    pen.circle(cx, cy, 38, 18);
    pen.fillStroke(null, 4);
    ctx.fillStyle = INK;
    ctx.font = '800 34px "Baloo 2", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESET', cx, cy + 3);
  } else {
    pen.circle(cx, cy, shape === 'orb' ? 34 : 44, 16);
    pen.fillStroke(css, W);
    // A little shine.
    pen.path([[cx - 16, cy - 14], [cx - 6, cy - 22]]);
    pen.stroke(5, '#ffffff');
  }
  if (shape === 'creature' || shape === 'ghost') {
    for (const dx of [-14, 14]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + dx, cy - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx + dx + 2, cy - 7, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    pen.path([[cx - 10, cy + 14], [cx, cy + 20], [cx + 10, cy + 14]]);
    pen.stroke(4);
  }
  ctx.font = '800 30px "Baloo 2", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = INK;
  ctx.strokeText(label, cx, 222, 244);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, cx, 222, 244);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  textures.set(key, tex);
  return tex;
}

/** Special collectibles: event pickups, reset buttons, ghosts. */
export class Pickups {
  readonly group = new THREE.Group();
  list: Pickup[] = [];

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  spawn(opts: {
    label: string;
    color: number;
    shape: PickupShape;
    effect?: PickupEffect;
    eventId?: string | null;
    bad?: boolean;
    at?: THREE.Vector3;
    near?: THREE.Vector3;
    currentU?: number;
    life?: number;
    size?: number;
    icon?: DoodleIcon;
  }): Pickup {
    const mat = new THREE.SpriteMaterial({
      map: iconTexture(opts.shape, opts.color, opts.label, opts.icon),
      transparent: true,
      depthWrite: false,
      opacity: opts.shape === 'ghost' ? 0.6 : 1,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(opts.size ?? 3.2);
    if (opts.at) sprite.position.copy(opts.at);
    else if (opts.near) {
      do sprite.position.copy(opts.near).add(randomInSphere(28));
      while (sprite.position.distanceTo(opts.near) < 10);
      if (sprite.position.length() > this.radius * 0.9) sprite.position.setLength(this.radius * 0.9);
    } else randomInSphere(this.radius * 0.8, sprite.position);
    this.group.add(sprite);
    const p: Pickup = {
      sprite,
      label: opts.label,
      effect: opts.effect ?? {},
      eventId: opts.eventId ?? null,
      bad: !!opts.bad,
      velocity: new THREE.Vector3(),
      currentU: opts.currentU,
      life: opts.life ?? Infinity,
    };
    if (opts.shape === 'ghost') p.wander = randomInSphere(this.radius * 0.7);
    this.list.push(p);
    return p;
  }

  update(dt: number, t: number, player: THREE.Vector3, ride?: (p: Pickup, dt: number) => void): void {
    for (const p of this.list) {
      p.life -= dt;
      if (p.wander) {
        // Ghosts drift away from you, just out of reach.
        const pos = p.sprite.position;
        if (pos.distanceTo(p.wander) < 4) randomInSphere(this.radius * 0.7, p.wander);
        const away = pos.distanceTo(player) < 14;
        const target = away ? pos.clone().sub(player).setLength(8).add(pos) : p.wander;
        p.velocity.lerp(target.sub(pos).setLength(away ? 11 : 6), Math.min(1, dt));
        pos.addScaledVector(p.velocity, dt);
        if (pos.length() > this.radius * 0.9) pos.setLength(this.radius * 0.9);
      } else if (ride && p.currentU !== undefined) {
        ride(p, dt);
      }
      p.sprite.position.y += Math.sin(t * 2 + p.sprite.id) * 0.01;
    }
    const expired = this.list.filter((p) => p.life <= 0);
    for (const p of expired) this.remove(p);
  }

  /** Pickups the player is touching. */
  touching(pos: THREE.Vector3, reach: number): Pickup[] {
    return this.list.filter((p) => p.sprite.position.distanceTo(pos) < reach + p.sprite.scale.x * 0.35);
  }

  remove(p: Pickup): void {
    this.group.remove(p.sprite);
    p.sprite.material.dispose();
    this.list = this.list.filter((q) => q !== p);
  }

  clearEvent(eventId: string): void {
    for (const p of this.list.filter((q) => q.eventId === eventId)) this.remove(p);
  }

  countFor(eventId: string): number {
    return this.list.filter((p) => p.eventId === eventId).length;
  }
}

export interface Beacon {
  group: THREE.Group;
  radius: number;
}

/** Big glowing rings the player stays near (GPU clusters, partner hubs). */
export class Beacons {
  readonly group = new THREE.Group();
  list: Beacon[] = [];

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  spawn(label: string, color: number, count: number, near: THREE.Vector3): void {
    for (let i = 0; i < count; i++) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(6, 0.35, 8, 40),
        new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      );
      const core = new THREE.Mesh(
        new THREE.IcosahedronGeometry(1.6, 1),
        new THREE.MeshBasicMaterial({ color, wireframe: true, toneMapped: false }),
      );
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture('orb', color, label), transparent: true, depthWrite: false }));
      tag.scale.setScalar(5);
      tag.position.y = 8;
      g.add(ring, core, tag);
      do g.position.copy(near).add(randomInSphere(35));
      while (g.position.distanceTo(near) < 14);
      if (g.position.length() > this.radius * 0.85) g.position.setLength(this.radius * 0.85);
      this.group.add(g);
      this.list.push({ group: g, radius: 9 });
    }
  }

  update(t: number): void {
    for (const b of this.list) {
      b.group.children[0].rotation.set(t * 0.6, t * 0.4, 0);
      b.group.children[1].rotation.y = t;
    }
  }

  near(p: THREE.Vector3): boolean {
    return this.list.some((b) => b.group.position.distanceTo(p) < b.radius);
  }

  clear(): void {
    this.group.clear();
    this.list = [];
  }
}
