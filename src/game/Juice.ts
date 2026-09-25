import * as THREE from 'three';

const MAX_POPUPS = 14;
const BURST_POOL = 240;

/** A little four-point doodle star for burst particles. */
function starTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1b1330';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 ? 9 : 26;
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Game feel: floating score popups, star bursts, screen shake, and hit flashes.
 * Purely cosmetic; reduced motion turns shake off and tones the rest down.
 */
export class Juice {
  private readonly layer: HTMLDivElement;
  private readonly flashEl: HTMLDivElement;
  private readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private next = 0;
  private trauma = 0;
  private readonly v = new THREE.Vector3();
  private readonly c = new THREE.Color();
  reducedMotion = false;

  constructor(scene: THREE.Scene, overlay: HTMLElement, private readonly camera: THREE.Camera) {
    this.layer = document.createElement('div');
    this.layer.className = 'juice-layer';
    this.flashEl = document.createElement('div');
    this.flashEl.className = 'hit-flash';
    overlay.append(this.layer, this.flashEl);

    this.pos = new Float32Array(BURST_POOL * 3);
    this.col = new Float32Array(BURST_POOL * 3);
    this.vel = new Float32Array(BURST_POOL * 3);
    this.life = new Float32Array(BURST_POOL);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 1.1, map: starTexture(), vertexColors: true, transparent: true, alphaTest: 0.3, depthWrite: false }),
    );
    this.points.frustumCulled = false;
    for (let i = 0; i < BURST_POOL; i++) this.pos[i * 3 + 1] = 1e5;
    scene.add(this.points);
  }

  /** "+20" (or any text) floating up from a world position. */
  popup(at: THREE.Vector3, text: string, cls = ''): void {
    if (this.layer.childElementCount >= MAX_POPUPS) return;
    this.v.copy(at).project(this.camera);
    if (this.v.z > 1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) return;
    const el = document.createElement('div');
    el.className = `popup ${cls}`;
    el.textContent = text;
    el.style.left = `${((this.v.x + 1) / 2) * 100}%`;
    el.style.top = `${((1 - this.v.y) / 2) * 100}%`;
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 40}px`);
    this.layer.append(el);
    setTimeout(() => el.remove(), 900);
  }

  /** A big centered callout ("On a roll!"). */
  callout(text: string, cls = ''): void {
    const el = document.createElement('div');
    el.className = `callout ${cls}`;
    el.textContent = text;
    this.layer.append(el);
    setTimeout(() => el.remove(), 1400);
  }

  /** A burst of doodle stars. */
  burst(at: THREE.Vector3, color: number, count = 8, speed = 6): void {
    this.c.setHex(color);
    const n = this.reducedMotion ? Math.ceil(count / 2) : count;
    for (let k = 0; k < n; k++) {
      const i = this.next++ % BURST_POOL;
      this.v.randomDirection().multiplyScalar(speed * (0.5 + Math.random() * 0.8));
      this.pos.set([at.x, at.y, at.z], i * 3);
      this.vel.set([this.v.x, this.v.y, this.v.z], i * 3);
      this.col.set([this.c.r, this.c.g, this.c.b], i * 3);
      this.life[i] = 0.5 + Math.random() * 0.3;
    }
  }

  /** Adds screen shake (0..1). */
  shake(amount: number): void {
    if (!this.reducedMotion) this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A quick colored screen flash. */
  flash(kind: 'hit' | 'good' = 'hit'): void {
    this.flashEl.className = `hit-flash ${kind}`;
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('on');
  }

  update(dt: number): void {
    const p = this.pos;
    for (let i = 0; i < BURST_POOL; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const drag = 1 - Math.min(1, dt * 3);
      for (let a = 0; a < 3; a++) {
        this.vel[i * 3 + a] *= drag;
        p[i * 3 + a] += this.vel[i * 3 + a] * dt;
      }
      if (this.life[i] <= 0) p[i * 3 + 1] = 1e5;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  /** Camera offset from shake; call after placing the camera. */
  applyShake(camera: THREE.Camera, t: number): void {
    if (this.trauma <= 0) return;
    const s = this.trauma * this.trauma * 0.6;
    camera.position.x += Math.sin(t * 47) * s;
    camera.position.y += Math.sin(t * 53 + 1) * s;
    camera.rotateZ(Math.sin(t * 31) * s * 0.05);
  }
}
