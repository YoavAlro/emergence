import * as THREE from 'three';
import type { RivalSpec } from '../config/models';
import { randomInSphere } from './Ocean';

interface Rival {
  spec: RivalSpec;
  group: THREE.Group;
  velocity: THREE.Vector3;
  wander: THREE.Vector3;
  size: number;
}

const CHASE_RANGE = 45;

/** Competing labs' models: bigger predators that hunt you. */
export class Rivals {
  readonly group = new THREE.Group();
  private list: Rival[] = [];

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  configure(specs: RivalSpec[], size: number, avoid: THREE.Vector3): void {
    this.group.clear();
    this.list = specs.map((spec) => {
      const group = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xff3d7f, emissive: 0xff1f5a, emissiveIntensity: 1.4 });
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat);
      const label = makeLabel(`${spec.name} · ${spec.org}`);
      label.scale.set(size * 5, size * 1.25, 1);
      label.position.y = size * 1.9;
      group.add(body, label);
      do randomInSphere(this.radius * 0.8, group.position);
      while (group.position.distanceTo(avoid) < 40);
      this.group.add(group);
      return { spec, group, size, velocity: new THREE.Vector3(), wander: randomInSphere(this.radius * 0.8) };
    });
  }

  update(dt: number, t: number, playerPos: THREE.Vector3): void {
    const desired = new THREE.Vector3();
    for (const r of this.list) {
      const pos = r.group.position;
      const chasing = pos.distanceTo(playerPos) < CHASE_RANGE;
      if (!chasing && pos.distanceTo(r.wander) < 5) randomInSphere(this.radius * 0.8, r.wander);
      desired.subVectors(chasing ? playerPos : r.wander, pos).normalize().multiplyScalar(chasing ? 8 + r.size : 4);
      r.velocity.lerp(desired, Math.min(1, dt * 1.2));
      pos.addScaledVector(r.velocity, dt);
      r.group.children[0].rotation.set(t * 0.7, t * 0.5, 0);
    }
  }

  /** The rival touching the player, if any. */
  hitTest(playerPos: THREE.Vector3, playerSize: number): Rival | undefined {
    return this.list.find((r) => r.group.position.distanceTo(playerPos) < r.size + playerSize * 0.8);
  }

  /** Shoves the rival away after it lands a hit, so it can't chain-hit. */
  repel(rival: Rival, from: THREE.Vector3): void {
    rival.velocity.subVectors(rival.group.position, from).normalize().multiplyScalar(25);
  }
}

function makeLabel(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffb3cc';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
}
