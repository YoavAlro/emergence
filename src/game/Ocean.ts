import * as THREE from 'three';

export const OCEAN_COLOR = 0x020816;

export type OceanMood = 'normal' | 'red' | 'gold' | 'grey' | 'internet' | 'think';

const MOODS: Record<OceanMood, { bg: number; light: number; lattice: number }> = {
  normal: { bg: OCEAN_COLOR, light: 0x6fb7ff, lattice: 0x1b4a8a },
  red: { bg: 0x1a0308, light: 0xff6f7f, lattice: 0x8a1b2a },
  gold: { bg: 0x120d02, light: 0xffd88a, lattice: 0x8a6a1b },
  grey: { bg: 0x0b0e14, light: 0x9aa4b4, lattice: 0x3a4250 },
  internet: { bg: 0x021208, light: 0x9affc0, lattice: 0x1b8a4a },
  think: { bg: 0x08041a, light: 0xb08cff, lattice: 0x4a2a8a },
};

/** Static backdrop: fog, lights, drifting dust, and the neural-lattice boundary. */
export class Ocean {
  readonly group = new THREE.Group();
  private readonly dust: THREE.Points;
  private readonly light: THREE.HemisphereLight;
  private readonly latticeMat: THREE.MeshBasicMaterial;
  private readonly bg = new THREE.Color(OCEAN_COLOR);
  private readonly target = new THREE.Color();
  mood: OceanMood = 'normal';

  constructor(private readonly scene: THREE.Scene, readonly radius: number, dustCount: number) {
    scene.background = this.bg;
    scene.fog = new THREE.FogExp2(OCEAN_COLOR, 0.011);
    this.light = new THREE.HemisphereLight(0x6fb7ff, 0x0a0420, 1.2);
    scene.add(this.light);

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

    this.latticeMat = new THREE.MeshBasicMaterial({ color: 0x1b4a8a, wireframe: true, transparent: true, opacity: 0.18 });
    const lattice = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 3), this.latticeMat);

    this.group.add(this.dust, lattice);
    scene.add(this.group);
  }

  update(dt: number, t: number): void {
    this.dust.rotation.y = t * 0.01;
    const m = MOODS[this.mood];
    const k = Math.min(1, dt * 2);
    this.bg.lerp(this.target.setHex(m.bg), k);
    (this.scene.fog as THREE.FogExp2).color.copy(this.bg);
    this.light.color.lerp(this.target.setHex(m.light), k);
    this.latticeMat.color.lerp(this.target.setHex(m.lattice), k);
  }
}

export function randomInSphere(radius: number, out = new THREE.Vector3()): THREE.Vector3 {
  out.randomDirection().multiplyScalar(radius * Math.cbrt(Math.random()));
  return out;
}
