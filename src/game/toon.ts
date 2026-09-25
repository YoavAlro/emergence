import * as THREE from 'three';

/** Cartoon look: 3-step toon shading plus inverted-hull ink outlines. */

export const INK_COLOR = 0x1b1330;

let gradient: THREE.DataTexture | null = null;
function gradientMap(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 170, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

export function toonMat(color: number, glow = 0.18): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: gradientMap(), emissive: color, emissiveIntensity: glow });
}

const inkMat = new THREE.MeshBasicMaterial({ color: INK_COLOR, side: THREE.BackSide });

/** Adds a black outline shell to a mesh (or every mesh in a group). */
export function outline<T extends THREE.Object3D>(obj: T, thickness = 0.06): T {
  const meshes: THREE.Mesh[] = [];
  obj.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && !o.userData.isOutline) meshes.push(o as THREE.Mesh);
  });
  for (const m of meshes) {
    const shell = new THREE.Mesh(m.geometry, inkMat);
    shell.userData.isOutline = true;
    shell.scale.setScalar(1 + thickness);
    shell.renderOrder = -1;
    m.add(shell);
  }
  return obj;
}

/** Big cartoon eyes: white balls with pupils that can look somewhere. */
export class Eyes {
  readonly group = new THREE.Group();
  private readonly pupils: THREE.Mesh[] = [];
  private readonly lids: THREE.Mesh[] = [];
  private blinkUntil = 0;
  private nextBlink = 2 + Math.random() * 3;
  // Just under the bloom threshold, so eyes read as white without glowing.
  private readonly white = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
  private readonly black = new THREE.MeshBasicMaterial({ color: INK_COLOR });

  constructor(private readonly size: number, spacing: number, lidColor: number, angry = false) {
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), this.white);
      eye.position.set(spacing * s, 0, 0);
      outline(eye, 0.12);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 12, 10), this.black);
      pupil.position.set(0, 0, size * 0.72);
      eye.add(pupil);
      this.pupils.push(pupil);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(size * 1.04, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: lidColor }));
      lid.visible = false;
      eye.add(lid);
      this.lids.push(lid);
      if (angry) {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(size * 1.6, size * 0.35, size * 0.3), this.black);
        brow.position.set(0, size * 1.05, size * 0.4);
        brow.rotation.z = -0.5 * s;
        eye.add(brow);
      }
      this.group.add(eye);
    }
  }

  /** `dir` is where to look, in the eyes' parent space (roughly). */
  update(t: number, look?: THREE.Vector3): void {
    if (t > this.nextBlink) {
      this.blinkUntil = t + 0.12;
      this.nextBlink = t + 2 + Math.random() * 4;
    }
    const blinking = t < this.blinkUntil;
    for (const lid of this.lids) lid.visible = blinking;
    if (look) {
      for (const p of this.pupils) {
        p.position.x = THREE.MathUtils.clamp(look.x, -1, 1) * 0.3 * this.size;
        p.position.y = THREE.MathUtils.clamp(look.y, -1, 1) * 0.3 * this.size;
      }
    }
  }
}
