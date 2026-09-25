import * as THREE from 'three';
import { BODY_R, SIZE } from '../ui/creatures';

/**
 * Flat hand-drawn sprites. Each look is a pair of canvas textures that alternate
 * a few times a second, like the "line boil" of hand-drawn animation.
 */
const cache = new Map<string, THREE.CanvasTexture[]>();

export function frames(key: string, draw: (ctx: CanvasRenderingContext2D, frame: number) => void, n = 2, size = SIZE): THREE.CanvasTexture[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const list = Array.from({ length: n }, (_, f) => {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d')!, f);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  });
  cache.set(key, list);
  return list;
}

/** World size of a sprite whose body (BODY_R canvas px) should be `radius` world units. */
export const spriteScale = (radius: number) => (radius * SIZE) / BODY_R;

let boilOff = false;
/** Reduced motion: stop the line boil. */
export function setBoil(on: boolean): void {
  boilOff = !on;
}

export class Doodle {
  readonly sprite: THREE.Sprite;
  readonly material: THREE.SpriteMaterial;
  private looks: THREE.Texture[];
  private readonly phase = Math.random() * 10;
  /** Body radius in world units. */
  radius = 1;
  /** Horizontal flip (faces left). */
  flip = false;
  squashX = 1;
  squashY = 1;

  constructor(looks: THREE.Texture[], radius = 1, opts: { alphaTest?: number; opacity?: number } = {}) {
    this.looks = looks;
    this.material = new THREE.SpriteMaterial({
      map: looks[0],
      alphaTest: opts.alphaTest ?? (opts.opacity !== undefined ? 0.02 : 0.5),
      transparent: opts.opacity !== undefined,
      opacity: opts.opacity ?? 1,
      depthWrite: opts.opacity === undefined,
      // Flipping uses a negative scale, so draw both faces.
      side: THREE.DoubleSide,
    });
    this.sprite = new THREE.Sprite(this.material);
    this.radius = radius;
    this.apply();
  }

  /**
   * Fades the sprite when it's right in front of the camera, so a rival swimming
   * between you and the camera doesn't hide the screen. Returns true if faded.
   */
  fadeNear(camera: THREE.Vector3, world: THREE.Vector3): boolean {
    const near = camera.distanceTo(world) < this.radius * 2.2 + 3;
    const faded = this.material.userData.faded === true;
    if (near !== faded) {
      this.material.userData.faded = near;
      if (this.material.userData.baseOpacity === undefined) this.material.userData.baseOpacity = this.material.opacity;
      this.material.transparent = near || this.material.userData.baseOpacity < 1;
      this.material.opacity = near ? 0.22 : this.material.userData.baseOpacity;
      this.material.alphaTest = near ? 0.02 : this.material.userData.baseOpacity < 1 ? 0.02 : 0.5;
      this.material.depthWrite = !near && this.material.userData.baseOpacity >= 1;
      this.material.needsUpdate = true;
    }
    return near;
  }

  setLooks(looks: THREE.Texture[]): void {
    this.looks = looks;
  }

  get position(): THREE.Vector3 {
    return this.sprite.position;
  }

  private apply(): void {
    const s = spriteScale(this.radius);
    this.sprite.scale.set(s * this.squashX * (this.flip ? -1 : 1), s * this.squashY, 1);
  }

  update(t: number): void {
    const f = boilOff ? 0 : Math.floor(t * 5 + this.phase) % this.looks.length;
    if (this.material.map !== this.looks[f]) this.material.map = this.looks[f];
    this.apply();
  }
}
