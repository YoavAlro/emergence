import * as THREE from 'three';
import { makeLabel } from './labels';

/** Glowing rings into the live-internet biome (Stage 4+). */
export class Portals {
  readonly group = new THREE.Group();
  private readonly rings: THREE.Group[] = [];
  private cooldown = 0;

  constructor(scene: THREE.Scene, worldRadius: number) {
    const spots = [
      new THREE.Vector3(worldRadius * 0.35, 8, -worldRadius * 0.2),
      new THREE.Vector3(-worldRadius * 0.4, -10, worldRadius * 0.3),
      new THREE.Vector3(0, 20, worldRadius * 0.55),
    ];
    for (const p of spots) {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.5, 0.5, 10, 48),
        new THREE.MeshBasicMaterial({ color: 0xc6ff4d, toneMapped: false }),
      );
      const film = new THREE.Mesh(
        new THREE.CircleGeometry(4.2, 32),
        new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
      );
      const tag = makeLabel('Live internet', '#e8ffb0');
      tag.scale.set(10, 2.5, 1);
      tag.position.y = 7;
      g.add(ring, film, tag);
      g.position.copy(p);
      g.lookAt(0, p.y, 0);
      this.group.add(g);
      this.rings.push(g);
    }
    this.group.visible = false;
    scene.add(this.group);
  }

  get enabled(): boolean {
    return this.group.visible;
  }

  set enabled(v: boolean) {
    this.group.visible = v;
  }

  update(dt: number, t: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.rings.forEach((g, i) => {
      g.children[0].rotation.z = t * (0.8 + i * 0.2);
      (g.children[1] as THREE.Mesh).scale.setScalar(1 + Math.sin(t * 3 + i) * 0.05);
    });
  }

  /** True once when the player swims through a ring. */
  entered(p: THREE.Vector3): boolean {
    if (!this.enabled || this.cooldown > 0) return false;
    const hit = this.rings.some((g) => g.position.distanceTo(p) < 4.5);
    if (hit) this.cooldown = 3;
    return hit;
  }

  nearest(p: THREE.Vector3): THREE.Vector3 {
    return this.rings.reduce((a, b) => (a.position.distanceTo(p) < b.position.distanceTo(p) ? a : b)).position;
  }
}
