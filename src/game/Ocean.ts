import * as THREE from 'three';

export const OCEAN_COLOR = 0x123e63;

export type OceanMood = 'normal' | 'red' | 'gold' | 'grey' | 'internet' | 'think';

const MOODS: Record<OceanMood, { bg: number; light: number; lattice: number }> = {
  normal: { bg: OCEAN_COLOR, light: 0xd8efff, lattice: 0x6fb7e8 },
  red: { bg: 0x4a1426, light: 0xffc2c8, lattice: 0xe06a7a },
  gold: { bg: 0x4a3810, light: 0xfff0c2, lattice: 0xe8c25a },
  grey: { bg: 0x2a303a, light: 0xd0d6e0, lattice: 0x8a94a4 },
  internet: { bg: 0x0f4a38, light: 0xd2ffe4, lattice: 0x5ad69a },
  think: { bg: 0x2a1a5c, light: 0xe2d4ff, lattice: 0xa88aff },
};

/** A soft ring doodle: drifting bubbles instead of glowing dust. */
function bubbleTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(24, 23, 5, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Static backdrop: fog, lights, drifting bubbles, and the neural-lattice boundary. */
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
    scene.fog = new THREE.FogExp2(OCEAN_COLOR, 0.012);
    this.light = new THREE.HemisphereLight(0xd8efff, 0x3a2a70, 2.2);
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(0.4, 1, 0.3);
    scene.add(sun);
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
      new THREE.PointsMaterial({ color: 0xbfe6ff, map: bubbleTexture(), size: 0.7, transparent: true, opacity: 0.55, depthWrite: false }),
    );

    this.latticeMat = new THREE.MeshBasicMaterial({ color: 0x1b4a8a, wireframe: true, transparent: true, opacity: 0.22 });
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
