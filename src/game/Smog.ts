import * as THREE from 'three';
import { randomInSphere } from './Ocean';

interface Cloud {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  radius: number;
}

/** Drifting clouds of toxic data. Staying inside raises toxicity. */
export class Smog {
  readonly group = new THREE.Group();
  private clouds: Cloud[] = [];
  private readonly material = new THREE.MeshBasicMaterial({
    color: 0xff2244,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private readonly geometry = new THREE.IcosahedronGeometry(1, 3);

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  configure(count: number, avoid: THREE.Vector3): void {
    this.group.clear();
    this.clouds = Array.from({ length: count }, () => {
      const radius = 9 + Math.random() * 8;
      const mesh = new THREE.Mesh(this.geometry, this.material);
      mesh.scale.setScalar(radius);
      do randomInSphere(this.radius * 0.75, mesh.position);
      while (mesh.position.distanceTo(avoid) < radius + 15);
      this.group.add(mesh);
      return { mesh, radius, velocity: new THREE.Vector3().randomDirection().multiplyScalar(1.5) };
    });
  }

  update(dt: number, t: number): void {
    for (const c of this.clouds) {
      c.mesh.position.addScaledVector(c.velocity, dt);
      if (c.mesh.position.length() > this.radius * 0.8) c.velocity.negate();
      c.mesh.rotation.y = t * 0.1;
    }
  }

  contains(p: THREE.Vector3): boolean {
    return this.clouds.some((c) => c.mesh.position.distanceTo(p) < c.radius);
  }
}
