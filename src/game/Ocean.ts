import * as THREE from 'three';

export const OCEAN_COLOR = 0x020816;

/** Static backdrop: fog, lights, drifting dust, and the neural-lattice boundary. */
export class Ocean {
  readonly group = new THREE.Group();
  private readonly dust: THREE.Points;

  constructor(scene: THREE.Scene, readonly radius: number, dustCount: number) {
    scene.background = new THREE.Color(OCEAN_COLOR);
    scene.fog = new THREE.FogExp2(OCEAN_COLOR, 0.011);
    scene.add(new THREE.HemisphereLight(0x6fb7ff, 0x0a0420, 1.2));

    const positions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const p = randomInSphere(radius * 1.3);
      positions.set([p.x, p.y, p.z], i * 3);
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({ color: 0x3a6fa8, size: 0.25, transparent: true, opacity: 0.6, depthWrite: false }),
    );

    const lattice = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius, 3),
      new THREE.MeshBasicMaterial({ color: 0x1b4a8a, wireframe: true, transparent: true, opacity: 0.18 }),
    );

    this.group.add(this.dust, lattice);
    scene.add(this.group);
  }

  update(t: number): void {
    this.dust.rotation.y = t * 0.01;
  }
}

export function randomInSphere(radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  out.randomDirection().multiplyScalar(radius * Math.cbrt(Math.random()));
  return out;
}
