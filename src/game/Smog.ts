import * as THREE from 'three';
import { drawCloud } from '../ui/creatures';
import { randomInSphere } from './Ocean';
import { Doodle, frames } from './sprites';

interface Cloud {
  group: THREE.Group;
  puffs: Doodle[];
  velocity: THREE.Vector3;
  radius: number;
}

/** Drifting clouds of toxic data: clusters of doodled puffs. Staying inside raises toxicity. */
export class Smog {
  readonly group = new THREE.Group();
  private clouds: Cloud[] = [];

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  configure(count: number, avoid: THREE.Vector3): void {
    this.group.clear();
    const looks = frames('cloud', drawCloud);
    this.clouds = Array.from({ length: count }, () => {
      const radius = 9 + Math.random() * 8;
      const group = new THREE.Group();
      const puffs = Array.from({ length: 4 }, (_, i) => {
        const d = new Doodle(looks, radius * (i === 0 ? 0.42 : 0.3), { opacity: 0.8 });
        if (i > 0) d.position.copy(randomInSphere(1).setLength(radius * 0.5));
        d.material.rotation = Math.random() * 0.6 - 0.3;
        group.add(d.sprite);
        return d;
      });
      do randomInSphere(this.radius * 0.75, group.position);
      while (group.position.distanceTo(avoid) < radius + 15);
      this.group.add(group);
      return { group, puffs, radius, velocity: new THREE.Vector3().randomDirection().multiplyScalar(1.5) };
    });
  }

  update(dt: number, t: number): void {
    for (const c of this.clouds) {
      c.group.position.addScaledVector(c.velocity, dt);
      if (c.group.position.length() > this.radius * 0.8) c.velocity.negate();
      // The cloud breathes.
      const s = 1 + Math.sin(t * 1.5 + c.radius) * 0.04;
      for (const p of c.puffs) {
        p.squashX = s;
        p.squashY = 1 / s;
        p.update(t);
      }
    }
  }

  contains(p: THREE.Vector3): boolean {
    return this.clouds.some((c) => c.group.position.distanceTo(p) < c.radius);
  }
}
