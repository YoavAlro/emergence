import * as THREE from 'three';
import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import type { Mix } from '../config/types';
import { drawIcon, type DoodleIcon } from '../ui/doodle';
import { randomInSphere } from './Ocean';

/** Hallucinations are false facts; reward hacks look like Human Feedback but game the reward. */
export type ParticleKind = DataTypeId | 'hallucination' | 'rewardHack';

export interface CollectOptions {
  /** Think mode: hidden data is visible and edible. */
  thinking: boolean;
  /** Particles inside this sphere can't be eaten. */
  closed?: { center: THREE.Vector3; radius: number } | null;
}

const GREY = new THREE.Color(0x8a90a0);
const BRIDGE = new THREE.Color(0xe0513f);
const PRAISE = new THREE.Color(0xff9ad5);

/** Every icon the ocean can show, laid out in a texture atlas (two boil frames). */
const ATLAS_ICONS: DoodleIcon[] = [
  ...new Set<DoodleIcon>([...Object.values(DATA_TYPES).map((d) => d.icon), 'question', 'bridge', 'heart']),
];
const COLS = 8;
const ROWS = Math.ceil(ATLAS_ICONS.length / COLS);
const CELL = 128;
const iconIndex = (icon: DoodleIcon) => ATLAS_ICONS.indexOf(icon);

function buildAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = COLS * CELL;
  c.height = ROWS * 2 * CELL;
  const ctx = c.getContext('2d')!;
  for (let frame = 0; frame < 2; frame++) {
    ATLAS_ICONS.forEach((icon, i) => {
      const x = (i % COLS) * CELL + CELL / 2;
      const y = (Math.floor(i / COLS) + frame * ROWS) * CELL + CELL / 2;
      drawIcon(ctx, icon, x, y, CELL * 0.86, frame);
    });
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Thousands of edible data doodles, drawn as one instanced mesh of billboards. */
export class DataField {
  readonly mesh: THREE.InstancedMesh;
  private readonly kinds: ParticleKind[];
  readonly positions: THREE.Vector3[];
  private readonly phases: Float32Array;
  private readonly icons: THREE.InstancedBufferAttribute;
  private readonly special = new Set<number>();
  /** Hidden particles found by thinking stay visible until eaten. */
  private readonly revealed = new Set<number>();
  private table: { kind: ParticleKind; weight: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly material: THREE.ShaderMaterial;
  thinking = false;
  skin: 'bridges' | 'praise' | null = null;
  private lastThinking = false;
  private lastSkin: DataField['skin'] = null;
  closed: { center: THREE.Vector3; radius: number } | null = null;
  /** Where the player is thinking from, and how far thought reaches. */
  thinkFrom: THREE.Vector3 | null = null;
  thinkRange = 30;

  constructor(readonly count: number, private readonly radius: number, fogColor: THREE.Color) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: buildAtlas() },
        uTime: { value: 0 },
        uFog: { value: fogColor },
      },
      vertexShader: /* glsl */ `
        attribute float aIcon;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          float sx = length(instanceMatrix[0].xyz);
          float sy = length(instanceMatrix[1].xyz);
          vec4 mv = modelViewMatrix * vec4(instanceMatrix[3].xyz, 1.0);
          mv.xy += position.xy * vec2(sx, sy) * 1.7;
          gl_Position = projectionMatrix * mv;
          float frame = mod(floor(uTime * 3.0 + instanceMatrix[3].x * 0.37), 2.0);
          float col = mod(aIcon, ${COLS}.0);
          float row = floor(aIcon / ${COLS}.0) + frame * ${ROWS}.0;
          vUv = vec2((col + uv.x) / ${COLS}.0, 1.0 - (row + 1.0 - uv.y) / ${ROWS * 2}.0);
          vColor = instanceColor;
          vFade = clamp(1.0 - (-mv.z - 40.0) / 110.0, 0.0, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform vec3 uFog;
        varying vec2 vUv;
        varying vec3 vColor;
        varying float vFade;
        void main() {
          vec4 t = texture2D(uMap, vUv);
          if (t.a < 0.5) discard;
          gl_FragColor = vec4(mix(uFog, t.rgb * vColor, vFade), 1.0);
        }`,
    });
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), this.material, count);
    this.mesh.frustumCulled = false;
    this.icons = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    this.mesh.geometry.setAttribute('aIcon', this.icons);
    this.mesh.setColorAt(0, this.color.set(0xffffff));
    this.kinds = new Array(count).fill('books');
    this.positions = Array.from({ length: count }, () => new THREE.Vector3());
    this.phases = Float32Array.from({ length: count }, () => Math.random() * Math.PI * 2);
  }

  /** Re-stocks the whole ocean for a new era. */
  configure(spawn: Mix, hallucinationRate: number, rewardHackRate: number, avoid: THREE.Vector3): void {
    const real = 1 - hallucinationRate - rewardHackRate;
    this.table = Object.entries(spawn).map(([kind, weight]) => ({
      kind: kind as DataTypeId,
      weight: (weight ?? 0) * real,
    }));
    if (hallucinationRate > 0) this.table.push({ kind: 'hallucination', weight: hallucinationRate });
    if (rewardHackRate > 0) this.table.push({ kind: 'rewardHack', weight: rewardHackRate });
    this.special.clear();
    this.revealed.clear();
    for (let i = 0; i < this.count; i++) this.respawn(i, avoid);
    this.recolorAll();
  }

  kindAt(i: number): ParticleKind {
    return this.kinds[i];
  }

  update(t: number): void {
    this.material.uniforms.uTime.value = t;
    const closed = this.closed;
    const from = this.thinking ? this.thinkFrom : null;
    const rangeSq = this.thinkRange * this.thinkRange;
    for (let i = 0; i < this.count; i++) {
      const phase = this.phases[i];
      const kind = this.kinds[i];
      if (from && !this.revealed.has(i) && this.isHiddenKind(kind) && this.positions[i].distanceToSquared(from) < rangeSq) this.revealed.add(i);
      this.dummy.position.copy(this.positions[i]);
      this.dummy.position.y += Math.sin(t * 0.8 + phase) * 0.4;
      // A little bob-and-squash, like a bouncing cartoon.
      const squash = 1 + Math.sin(t * 2.2 + phase * 3) * 0.08;
      let scale = kind === 'hallucination' ? 1.2 : 1;
      if (this.isHidden(kind, i)) scale = 0;
      if (closed && this.positions[i].distanceToSquared(closed.center) < closed.radius * closed.radius) scale *= 0.35;
      if (this.skin === 'bridges') this.dummy.scale.set(scale * 1.4, scale * 1.1, 1);
      else this.dummy.scale.set(scale * squash, scale / squash, 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (this.thinking !== this.lastThinking || this.skin !== this.lastSkin) {
      this.lastThinking = this.thinking;
      this.lastSkin = this.skin;
      this.recolorAll();
    }
    if (!this.thinking && !this.skin) {
      for (const i of this.special) {
        if (this.kinds[i] === 'hallucination') {
          this.mesh.setColorAt(i, this.color.setHSL((t * 0.4 + this.phases[i]) % 1, 0.9, 0.6));
        }
      }
      if (this.special.size) this.mesh.instanceColor!.needsUpdate = true;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Pulls particles of these types toward `center` from within `range`. */
  attract(center: THREE.Vector3, types: Set<DataTypeId>, range: number, dt: number): void {
    if (!types.size) return;
    const rangeSq = range * range;
    const step = new THREE.Vector3();
    for (let i = 0; i < this.count; i++) {
      const kind = this.kinds[i];
      if (kind === 'hallucination' || kind === 'rewardHack' || !types.has(kind)) continue;
      if (this.isHidden(kind, i)) continue;
      const p = this.positions[i];
      const d2 = p.distanceToSquared(center);
      if (d2 > rangeSq || d2 < 0.01) continue;
      step.subVectors(center, p).setLength(Math.min(Math.sqrt(d2), 14 * dt));
      p.add(step);
    }
  }

  /** Eats every particle within `reach` of `center`, returning what was eaten (and where). */
  collect(center: THREE.Vector3, reach: number, opts: CollectOptions, where?: THREE.Vector3[]): ParticleKind[] {
    const eaten: ParticleKind[] = [];
    const reachSq = reach * reach;
    const closed = opts.closed;
    for (let i = 0; i < this.count; i++) {
      const p = this.positions[i];
      if (p.distanceToSquared(center) >= reachSq) continue;
      const kind = this.kinds[i];
      if (this.isHiddenKind(kind) && !opts.thinking && !this.revealed.has(i)) continue;
      if (closed && p.distanceToSquared(closed.center) < closed.radius * closed.radius) continue;
      eaten.push(kind);
      where?.push(p.clone());
      this.respawn(i, center);
      this.paint(i);
    }
    if (eaten.length) {
      this.mesh.instanceColor!.needsUpdate = true;
      this.icons.needsUpdate = true;
    }
    return eaten;
  }

  /** Index of the nearest edible particle of `type` (any real data if null) to `from`. */
  nearest(from: THREE.Vector3, type: DataTypeId | null, exclude?: Set<number>): number {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < this.count; i++) {
      const kind = this.kinds[i];
      if (kind === 'hallucination' || kind === 'rewardHack') continue;
      if (type ? kind !== type : false) continue;
      if (this.isHidden(kind, i)) continue;
      if (exclude?.has(i)) continue;
      const d = this.positions[i].distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** Indices of visible hallucinations and reward hacks within `range` (for the autopilot). */
  dangerNear(center: THREE.Vector3, range: number): number[] {
    const out: number[] = [];
    const r2 = range * range;
    for (const i of this.special) if (this.positions[i].distanceToSquared(center) < r2) out.push(i);
    return out;
  }

  /** Eats one particle by index (used by forks). */
  take(i: number, avoid: THREE.Vector3): ParticleKind {
    const kind = this.kinds[i];
    this.respawn(i, avoid);
    this.paint(i);
    this.mesh.instanceColor!.needsUpdate = true;
    this.icons.needsUpdate = true;
    return kind;
  }

  private isHiddenKind(kind: ParticleKind): boolean {
    return kind !== 'hallucination' && kind !== 'rewardHack' && !!DATA_TYPES[kind].hidden;
  }

  /** Hidden right now: a hidden type you haven't found by thinking. */
  private isHidden(kind: ParticleKind, i: number): boolean {
    return this.isHiddenKind(kind) && !this.thinking && !this.revealed.has(i);
  }

  /** How many hidden particles have been found and not yet eaten. */
  get revealedCount(): number {
    return this.revealed.size;
  }

  private respawn(i: number, avoid: THREE.Vector3): void {
    const p = this.positions[i];
    do randomInSphere(this.radius * 0.97, p);
    while (p.distanceToSquared(avoid) < 225);

    const kind = this.pickKind();
    this.kinds[i] = kind;
    this.revealed.delete(i);
    if (kind === 'hallucination' || kind === 'rewardHack') this.special.add(i);
    else this.special.delete(i);
  }

  private paint(i: number): void {
    const kind = this.kinds[i];
    let icon: DoodleIcon;
    if (this.skin === 'bridges') {
      icon = 'bridge';
      this.color.copy(BRIDGE);
    } else if (this.skin === 'praise') {
      icon = 'heart';
      this.color.copy(PRAISE);
    } else if (kind === 'hallucination') {
      icon = 'question';
      if (this.thinking) this.color.copy(GREY);
      else this.color.setHSL(this.phases[i] % 1, 0.9, 0.6);
    } else if (kind === 'rewardHack') {
      // Disguised as Human Feedback until you think about it.
      icon = this.thinking ? 'question' : DATA_TYPES.feedback.icon;
      if (this.thinking) this.color.copy(GREY);
      else this.color.setHex(DATA_TYPES.feedback.color);
    } else {
      icon = DATA_TYPES[kind].icon;
      this.color.setHex(DATA_TYPES[kind].color);
    }
    this.icons.setX(i, iconIndex(icon));
    this.mesh.setColorAt(i, this.color);
  }

  private recolorAll(): void {
    for (let i = 0; i < this.count; i++) this.paint(i);
    this.mesh.instanceColor!.needsUpdate = true;
    this.icons.needsUpdate = true;
  }

  private pickKind(): ParticleKind {
    const total = this.table.reduce((s, e) => s + e.weight, 0);
    let roll = Math.random() * total;
    for (const entry of this.table) {
      roll -= entry.weight;
      if (roll <= 0) return entry.kind;
    }
    return this.table[0]?.kind ?? 'books';
  }
}
