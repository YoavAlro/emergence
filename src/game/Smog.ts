import * as THREE from 'three';
import { drawIcon } from '../ui/doodle';
import { randomInSphere } from './Ocean';

interface Cloud {
  group: THREE.Group;
  velocity: THREE.Vector3;
  radius: number;
}

/** A doodled skull-on-a-book, the "toxic data" sign floating in each cloud. */
function signTexture(frame: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  drawIcon(c.getContext('2d')!, 'skullbook', 64, 64, 110, frame, '#d6ff8a');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Drifting clouds of toxic data: puffy cartoon clusters. Staying inside raises toxicity. */
export class Smog {
  readonly group = new THREE.Group();
  private clouds: Cloud[] = [];
  private readonly material = new THREE.MeshLambertMaterial({
    color: 0x8a4fb8,
    emissive: 0x4a2a70,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  private readonly geometry = new THREE.IcosahedronGeometry(1, 2);
  private readonly frames = [signTexture(0), signTexture(1)];
  private readonly signMat = new THREE.SpriteMaterial({ map: this.frames[0], transparent: true, depthWrite: false, opacity: 0.9 });

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  configure(count: number, avoid: THREE.Vector3): void {
    this.group.clear();
    this.clouds = Array.from({ length: count }, () => {
      const radius = 9 + Math.random() * 8;
      const group = new THREE.Group();
      // A cluster of puffs reads as a cartoon cloud.
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(this.geometry, this.material);
        const r = radius * (i === 0 ? 0.8 : 0.45 + Math.random() * 0.2);
        puff.scale.setScalar(r);
        if (i > 0) puff.position.copy(randomInSphere(1).setLength(radius * 0.55));
        group.add(puff);
      }
      for (let i = 0; i < 2; i++) {
        const sign = new THREE.Sprite(this.signMat);
        sign.scale.setScalar(4);
        sign.position.copy(randomInSphere(radius * 0.5));
        group.add(sign);
      }
      do randomInSphere(this.radius * 0.75, group.position);
      while (group.position.distanceTo(avoid) < radius + 15);
      this.group.add(group);
      return { group, radius, velocity: new THREE.Vector3().randomDirection().multiplyScalar(1.5) };
    });
  }

  update(dt: number, t: number): void {
    this.signMat.map = this.frames[Math.floor(t * 4) % 2];
    for (const c of this.clouds) {
      c.group.position.addScaledVector(c.velocity, dt);
      if (c.group.position.length() > this.radius * 0.8) c.velocity.negate();
      c.group.rotation.y = t * 0.1;
      // The cloud breathes.
      c.group.scale.setScalar(1 + Math.sin(t * 1.5 + c.radius) * 0.04);
    }
  }

  contains(p: THREE.Vector3): boolean {
    return this.clouds.some((c) => c.group.position.distanceTo(p) < c.radius);
  }
}
