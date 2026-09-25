import * as THREE from 'three';
import type { RivalSpec } from '../config/types';
import { faceTravel, makeCritter } from './critter';
import { makeLabel } from './labels';
import { randomInSphere } from './Ocean';
import type { Doodle } from './sprites';

export interface Rival {
  spec: RivalSpec;
  group: THREE.Group;
  doodle: Doodle;
  velocity: THREE.Vector3;
  wander: THREE.Vector3;
  size: number;
  /** Seconds left of a stumble (slowed, harmless, dropping users). */
  stumbling: number;
  /** A guest rival that only exists for one moment. */
  guest: boolean;
}

const CHASE_RANGE = 45;

/** Competing labs' models: bigger doodled predators that hunt you. */
export class Rivals {
  readonly group = new THREE.Group();
  list: Rival[] = [];
  /** Set by the Game each frame so rivals can face their direction of travel on screen. */
  cameraRight = new THREE.Vector3(1, 0, 0);

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  /** `currentPoint` places rivals born in the Timeline Current. */
  configure(specs: RivalSpec[], size: number, avoid: THREE.Vector3, currentPoint?: () => THREE.Vector3): void {
    this.group.clear();
    this.list = specs.map((spec) => this.make(spec, size, avoid, spec.fromCurrent ? currentPoint : undefined, false));
  }

  private make(spec: RivalSpec, size: number, avoid: THREE.Vector3, currentPoint: (() => THREE.Vector3) | undefined, guest: boolean): Rival {
    const doodle = makeCritter(spec.org, size);
    const group = new THREE.Group();
    const label = makeLabel(`${spec.name} · ${spec.org}`);
    label.scale.set(size * 5, size * 1.25, 1);
    label.position.y = size * 2.3;
    group.add(doodle.sprite, label);
    if (currentPoint) group.position.copy(currentPoint());
    else {
      do randomInSphere(this.radius * 0.8, group.position);
      while (group.position.distanceTo(avoid) < 40);
    }
    this.group.add(group);
    return { spec, group, doodle, size, velocity: new THREE.Vector3(), wander: randomInSphere(this.radius * 0.8), stumbling: 0, guest };
  }

  /** A rival stumbles (a public blunder). Spawns a guest rival nearby if it isn't in this era. */
  stumble(name: string, org: string, seconds: number, near: THREE.Vector3, size: number): Rival {
    let r = this.list.find((q) => q.spec.name === name);
    if (!r) {
      r = this.make({ name, org, date: '', blurb: '' }, size, near, undefined, true);
      r.group.position.copy(near).add(randomInSphere(20).setLength(22));
      this.list.push(r);
    }
    r.stumbling = seconds;
    r.doodle.material.color.setHex(0xb0b4c0);
    return r;
  }

  endStumbles(): void {
    for (const r of this.list.filter((q) => q.guest)) this.group.remove(r.group);
    this.list = this.list.filter((q) => !q.guest);
    for (const r of this.list) {
      r.stumbling = 0;
      r.doodle.material.color.setHex(0xffffff);
    }
  }

  update(dt: number, t: number, playerPos: THREE.Vector3, speedScale = 1): void {
    const desired = new THREE.Vector3();
    for (const r of this.list) {
      const pos = r.group.position;
      r.stumbling = Math.max(0, r.stumbling - dt);
      const chasing = !r.stumbling && pos.distanceTo(playerPos) < CHASE_RANGE;
      if (!chasing && pos.distanceTo(r.wander) < 5) randomInSphere(this.radius * 0.8, r.wander);
      const speed = r.stumbling ? 2 : chasing ? 8 + r.size : 4;
      desired.subVectors(chasing ? playerPos : r.wander, pos).normalize().multiplyScalar(speed * speedScale);
      r.velocity.lerp(desired, Math.min(1, dt * 1.2));
      pos.addScaledVector(r.velocity, dt);
      const d = r.doodle;
      d.radius = r.size;
      faceTravel(d, r.velocity, this.cameraRight);
      // A menacing bob, or a stumbling wobble.
      const wob = r.stumbling ? Math.sin(t * 8) * 0.35 : Math.sin(t * 3 + r.group.id) * 0.08;
      d.material.rotation = wob;
      const s = 1 + Math.sin(t * 6 + r.group.id) * 0.05;
      d.squashX = s;
      d.squashY = 1 / s;
      d.update(t);
    }
  }

  /** The rival touching the player, if any (stumbling rivals are harmless). */
  hitTest(playerPos: THREE.Vector3, playerSize: number): Rival | undefined {
    return this.list.find((r) => !r.stumbling && r.group.position.distanceTo(playerPos) < r.size + playerSize * 0.8);
  }

  /** Shoves the rival away after it lands a hit, so it can't chain-hit. */
  repel(rival: Rival, from: THREE.Vector3): void {
    rival.velocity.subVectors(rival.group.position, from).normalize().multiplyScalar(25);
  }
}
