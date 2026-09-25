import * as THREE from 'three';
import { drawEelHead, drawEelSegment, drawImp, drawShark } from '../ui/creatures';
import { critterLooks, faceTravel } from './critter';
import { makeLabel } from './labels';
import { randomInSphere } from './Ocean';
import { Doodle, frames } from './sprites';

export type HunterType = 'jailbreaker' | 'eel' | 'shark' | 'clone';

export interface Hunter {
  type: HunterType;
  group: THREE.Group;
  /** The main sprite (for eels: the head). */
  doodle: Doodle;
  /** Eel body segments. */
  segments: Doodle[];
  velocity: THREE.Vector3;
  wander: THREE.Vector3;
  size: number;
  speed: number;
  cooldown: number;
  eventId: string | null;
  /** Clones sweep in one direction like a wave. */
  sweep?: THREE.Vector3;
}

const SPECS: Record<HunterType, { size: number; speed: number; range: number }> = {
  jailbreaker: { size: 0.9, speed: 14, range: 32 },
  eel: { size: 0.8, speed: 11, range: 26 },
  shark: { size: 2.2, speed: 13, range: 45 },
  clone: { size: 2.4, speed: 16, range: 0 },
};

/** Persistent dangers: jailbreakers, prompt-injection eels, lawyer sharks, rival clones. All doodled sprites. */
export class Hunters {
  readonly group = new THREE.Group();
  list: Hunter[] = [];
  /** Think mode reveals camouflaged eels. */
  thinking = false;
  /** Set by the Game each frame so sprites face their screen-space travel. */
  cameraRight = new THREE.Vector3(1, 0, 0);
  private readonly tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  /** Replaces the era's persistent hunters (event hunters are kept). */
  configure(counts: Partial<Record<HunterType, number>>, avoid: THREE.Vector3): void {
    for (const h of this.list.filter((h) => !h.eventId)) this.remove(h);
    for (const [type, n] of Object.entries(counts)) {
      for (let i = 0; i < (n ?? 0); i++) this.spawn(type as HunterType, avoid, null);
    }
  }

  spawn(type: HunterType, avoid: THREE.Vector3, eventId: string | null, label?: string, org?: string): Hunter {
    const spec = SPECS[type];
    const group = new THREE.Group();
    const segments: Doodle[] = [];
    let doodle: Doodle;
    if (type === 'eel') {
      // A sneaky noodle, camouflaged until you think.
      doodle = new Doodle(frames('eel-head', drawEelHead), spec.size * 1.2, { opacity: 0.35 });
      for (let i = 0; i < 8; i++) {
        const seg = new Doodle(frames('eel-seg', drawEelSegment), spec.size * (1 - i * 0.08), { opacity: 0.35 });
        this.group.add(seg.sprite);
        segments.push(seg);
      }
      group.add(doodle.sprite);
    } else if (type === 'jailbreaker') {
      doodle = new Doodle(frames('imp', drawImp), spec.size);
      const tag = makeLabel('Jailbreaker', '#e2c4ff');
      tag.scale.set(6, 1.5, 1);
      tag.position.y = 2.4;
      group.add(doodle.sprite, tag);
    } else if (type === 'shark') {
      doodle = new Doodle(frames('shark', drawShark), spec.size * 0.7);
      const tag = makeLabel(label ?? 'Lawyer shark', '#d6e4ff');
      tag.scale.set(9, 2.2, 1);
      tag.position.y = spec.size * 2.2;
      group.add(doodle.sprite, tag);
    } else {
      doodle = new Doodle(critterLooks(org ?? ''), spec.size);
      const tag = makeLabel(label ?? 'Rival', '#ffc2d6');
      tag.scale.set(10, 2.5, 1);
      tag.position.y = spec.size * 2.4;
      group.add(doodle.sprite, tag);
    }
    do randomInSphere(this.radius * 0.85, group.position);
    while (group.position.distanceTo(avoid) < 35);
    for (const s of segments) s.position.copy(group.position);
    this.group.add(group);
    const h: Hunter = {
      type,
      group,
      doodle,
      segments,
      velocity: new THREE.Vector3(),
      wander: randomInSphere(this.radius * 0.8),
      size: spec.size,
      speed: spec.speed,
      cooldown: 0,
      eventId,
    };
    this.list.push(h);
    return h;
  }

  /** A wave of rival clones sweeping across the ocean from one side. */
  spawnTsunami(name: string, count: number, player: THREE.Vector3, eventId: string, org?: string): void {
    const dir = new THREE.Vector3().randomDirection().setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(dir, THREE.Object3D.DEFAULT_UP);
    for (let i = 0; i < count; i++) {
      const h = this.spawn('clone', player, eventId, name, org);
      h.group.position
        .copy(player)
        .addScaledVector(dir, -60 - Math.random() * 40)
        .addScaledVector(side, (Math.random() - 0.5) * 70)
        .add(new THREE.Vector3(0, (Math.random() - 0.5) * 30, 0));
      h.sweep = dir.clone();
    }
  }

  update(dt: number, t: number, player: THREE.Vector3, speedScale: number): void {
    for (const h of this.list) {
      const pos = h.group.position;
      h.cooldown = Math.max(0, h.cooldown - dt);
      if (h.sweep) {
        // Clones: sweep across, then wrap around to come again.
        this.tmp.copy(h.sweep).multiplyScalar(h.speed);
        this.tmp.addScaledVector(this.tmp.clone().subVectors(player, pos).setY(0).normalize(), 3);
        h.velocity.lerp(this.tmp, Math.min(1, dt * 2));
        if (pos.distanceTo(player) > 110) pos.copy(player).addScaledVector(h.sweep, -70).add(randomInSphere(25));
      } else {
        const range = SPECS[h.type].range * (h.type === 'eel' && !this.thinking ? 1 : 1.2);
        const chasing = h.cooldown === 0 && pos.distanceTo(player) < range;
        if (!chasing && pos.distanceTo(h.wander) < 5) randomInSphere(this.radius * 0.8, h.wander);
        this.tmp.subVectors(chasing ? player : h.wander, pos).normalize().multiplyScalar(chasing ? h.speed : h.speed * 0.4);
        if (h.type === 'eel') this.tmp.add(new THREE.Vector3(Math.sin(t * 5 + h.group.id), Math.cos(t * 4), 0).multiplyScalar(3));
        h.velocity.lerp(this.tmp, Math.min(1, dt * 1.5));
      }
      pos.addScaledVector(h.velocity, dt * speedScale);
      if (!h.sweep && pos.length() > this.radius) pos.setLength(this.radius);
      faceTravel(h.doodle, h.velocity, this.cameraRight);
      h.doodle.material.rotation = Math.sin(t * 4 + h.group.id) * 0.12;
      h.doodle.update(t);
      if (h.segments.length) {
        let prev = pos;
        for (const seg of h.segments) {
          const d = seg.position.distanceTo(prev);
          const gap = h.size * 1.3;
          if (d > gap) seg.position.lerp(prev, (d - gap) / d);
          prev = seg.position;
          seg.update(t);
        }
        // Camouflaged: faint and green-grey until Think mode reveals them.
        for (const d of [h.doodle, ...h.segments]) {
          d.material.opacity = this.thinking ? 1 : 0.3;
          d.material.color.setHex(this.thinking ? 0xffffff : 0x9ab870);
        }
      }
    }
  }

  /** The hunter touching the player, if any (and not on cooldown). */
  hitTest(player: THREE.Vector3, playerSize: number): Hunter | undefined {
    return this.list.find((h) => h.cooldown === 0 && h.group.position.distanceTo(player) < h.size * 1.2 + playerSize * 0.8);
  }

  /** Knocks a hunter away after it lands a hit. */
  repel(h: Hunter, from: THREE.Vector3): void {
    h.cooldown = 3;
    h.velocity.subVectors(h.group.position, from).normalize().multiplyScalar(h.speed * 2);
    if (h.sweep) h.group.position.addScaledVector(h.velocity, 0.2);
  }

  /** Pushes hunters away from a point (e.g. licensing deals keep sharks busy). */
  scatter(type: HunterType, from: THREE.Vector3): void {
    for (const h of this.list.filter((q) => q.type === type)) this.repel(h, from);
  }

  clearEvent(eventId: string): void {
    for (const h of this.list.filter((q) => q.eventId === eventId)) this.remove(h);
  }

  private remove(h: Hunter): void {
    this.group.remove(h.group);
    for (const s of h.segments) this.group.remove(s.sprite);
    this.list = this.list.filter((q) => q !== h);
  }
}
