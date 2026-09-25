import * as THREE from 'three';
import type { RivalSpec } from '../config/types';
import { makeLabel } from './labels';
import { randomInSphere } from './Ocean';

export interface Rival {
  spec: RivalSpec;
  group: THREE.Group;
  velocity: THREE.Vector3;
  wander: THREE.Vector3;
  size: number;
  /** Seconds left of a stumble (slowed, harmless, dropping users). */
  stumbling: number;
  /** A guest rival that only exists for one moment. */
  guest: boolean;
}

const CHASE_RANGE = 45;

/** Competing labs' models: bigger predators that hunt you. */
export class Rivals {
  readonly group = new THREE.Group();
  list: Rival[] = [];
  private readonly mat = new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff1f5a, emissiveIntensity: 1.4 });
  private readonly stumbleMat = new THREE.MeshStandardMaterial({ color: 0x8890a0, emissive: 0x404858, emissiveIntensity: 1 });

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  /** `currentPoint` places rivals born in the Timeline Current. */
  configure(specs: RivalSpec[], size: number, avoid: THREE.Vector3, currentPoint?: () => THREE.Vector3): void {
    this.group.clear();
    this.list = specs.map((spec) => this.make(spec, size, avoid, spec.fromCurrent ? currentPoint : undefined, false));
  }

  private make(spec: RivalSpec, size: number, avoid: THREE.Vector3, currentPoint: (() => THREE.Vector3) | undefined, guest: boolean): Rival {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), this.mat);
    const label = makeLabel(`${spec.name} · ${spec.org}`);
    label.scale.set(size * 5, size * 1.25, 1);
    label.position.y = size * 1.9;
    group.add(body, label);
    if (currentPoint) group.position.copy(currentPoint());
    else {
      do randomInSphere(this.radius * 0.8, group.position);
      while (group.position.distanceTo(avoid) < 40);
    }
    this.group.add(group);
    return { spec, group, size, velocity: new THREE.Vector3(), wander: randomInSphere(this.radius * 0.8), stumbling: 0, guest };
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
    (r.group.children[0] as THREE.Mesh).material = this.stumbleMat;
    return r;
  }

  endStumbles(): void {
    for (const r of this.list.filter((q) => q.guest)) this.group.remove(r.group);
    this.list = this.list.filter((q) => !q.guest);
    for (const r of this.list) {
      r.stumbling = 0;
      (r.group.children[0] as THREE.Mesh).material = this.mat;
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
      const spin = r.stumbling ? 4 : 1;
      r.group.children[0].rotation.set(t * 0.7 * spin, t * 0.5 * spin, 0);
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
