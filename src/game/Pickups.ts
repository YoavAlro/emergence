import * as THREE from 'three';
import type { PickupEffect } from '../config/types';
import { hexCss } from './labels';
import { randomInSphere } from './Ocean';

export type PickupShape = 'orb' | 'heart' | 'button' | 'shield' | 'creature' | 'ghost';

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

function iconTexture(shape: PickupShape, color: number, label: string): THREE.CanvasTexture {
  const key = `${shape}|${color}|${label}`;
  const cached = textures.get(key);
  if (cached) return cached;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const css = hexCss(color);
  const cx = 128;
  const cy = 100;
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 90);
  glow.addColorStop(0, css);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 200);
  ctx.fillStyle = css;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (shape === 'heart') {
    ctx.moveTo(cx, cy + 40);
    ctx.bezierCurveTo(cx - 70, cy - 10, cx - 30, cy - 60, cx, cy - 25);
    ctx.bezierCurveTo(cx + 30, cy - 60, cx + 70, cy - 10, cx, cy + 40);
  } else if (shape === 'shield') {
    ctx.moveTo(cx, cy - 50);
    ctx.lineTo(cx + 42, cy - 32);
    ctx.lineTo(cx + 36, cy + 20);
    ctx.lineTo(cx, cy + 50);
    ctx.lineTo(cx - 36, cy + 20);
    ctx.lineTo(cx - 42, cy - 32);
    ctx.closePath();
  } else if (shape === 'button') {
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  } else if (shape === 'creature' || shape === 'ghost') {
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  if (shape === 'button') {
    ctx.fillStyle = '#3a2a00';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('RESET', cx, cy + 2);
  }
  if (shape === 'creature' || shape === 'ghost') {
    ctx.fillStyle = '#031026';
    for (const [dx, dy] of [[-14, -8], [14, -8], [0, 14]]) {
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.font = '600 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, cx, 230, 250);
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
  }): Pickup {
    const mat = new THREE.SpriteMaterial({
      map: iconTexture(opts.shape, opts.color, opts.label),
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
