import * as THREE from 'three';
import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import type { Mix } from '../config/types';
import { randomInSphere } from './Ocean';

/** Hallucinations are false facts; reward hacks look like Human Feedback but game the reward. */
export type ParticleKind = DataTypeId | 'hallucination' | 'rewardHack';

export interface CollectOptions {
  /** Think mode: hidden data is visible and edible. */
  thinking: boolean;
  /** Particles inside this sphere can't be eaten. */
  closed?: { center: THREE.Vector3; radius: number } | null;
}

const GREY = new THREE.Color(0x5a6270);
const BRIDGE = new THREE.Color(0xc0362c);
const PRAISE = new THREE.Color(0xff9ad5);

/** Thousands of edible data particles, drawn as one InstancedMesh. */
export class DataField {
  readonly mesh: THREE.InstancedMesh;
  private readonly kinds: ParticleKind[];
  readonly positions: THREE.Vector3[];
  private readonly phases: Float32Array;
  private readonly special = new Set<number>();
  private table: { kind: ParticleKind; weight: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly tmp = new THREE.Vector3();
  thinking = false;
  skin: 'bridges' | 'praise' | null = null;
  private lastThinking = false;
  private lastSkin: DataField['skin'] = null;
  closed: { center: THREE.Vector3; radius: number } | null = null;

  constructor(readonly count: number, private readonly radius: number) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.38, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      count,
    );
    this.mesh.frustumCulled = false;
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
    for (let i = 0; i < this.count; i++) this.respawn(i, avoid);
    this.recolorAll();
  }

  kindAt(i: number): ParticleKind {
    return this.kinds[i];
  }

  update(t: number): void {
    const closed = this.closed;
    for (let i = 0; i < this.count; i++) {
      const phase = this.phases[i];
      const kind = this.kinds[i];
      this.dummy.position.copy(this.positions[i]);
      this.dummy.position.y += Math.sin(t * 0.8 + phase) * 0.4;
      this.dummy.rotation.set(t * 0.5 + phase, t * 0.3 + phase, 0);
      let scale = kind === 'hallucination' ? 1.3 : 1;
      if (this.isHidden(kind) && !this.thinking) scale = 0;
      if (closed && this.positions[i].distanceToSquared(closed.center) < closed.radius * closed.radius) scale *= 0.35;
      if (this.skin === 'bridges') this.dummy.scale.set(scale * 2.2, scale * 0.35, scale * 0.35);
      else this.dummy.scale.setScalar(scale);
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
          this.mesh.setColorAt(i, this.color.setHSL((t * 0.4 + this.phases[i]) % 1, 1, 0.65));
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
    for (let i = 0; i < this.count; i++) {
      const kind = this.kinds[i];
      if (kind === 'hallucination' || kind === 'rewardHack' || !types.has(kind)) continue;
      if (this.isHidden(kind) && !this.thinking) continue;
      const p = this.positions[i];
      const d2 = p.distanceToSquared(center);
      if (d2 > rangeSq || d2 < 0.01) continue;
      this.tmp.subVectors(center, p).setLength(Math.min(Math.sqrt(d2), 14 * dt));
      p.add(this.tmp);
    }
  }

  /** Eats every particle within `reach` of `center`, returning what was eaten. */
  collect(center: THREE.Vector3, reach: number, opts: CollectOptions): ParticleKind[] {
    const eaten: ParticleKind[] = [];
    const reachSq = reach * reach;
    const closed = opts.closed;
    for (let i = 0; i < this.count; i++) {
      const p = this.positions[i];
      if (p.distanceToSquared(center) >= reachSq) continue;
      const kind = this.kinds[i];
      if (this.isHidden(kind) && !opts.thinking) continue;
      if (closed && p.distanceToSquared(closed.center) < closed.radius * closed.radius) continue;
      eaten.push(kind);
      this.respawn(i, center);
      this.paint(i);
    }
    if (eaten.length) this.mesh.instanceColor!.needsUpdate = true;
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
      if (this.isHidden(kind) && !this.thinking) continue;
      if (exclude?.has(i)) continue;
      const d = this.positions[i].distanceToSquared(from);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  /** Eats one particle by index (used by forks). */
  take(i: number, avoid: THREE.Vector3): ParticleKind {
    const kind = this.kinds[i];
    this.respawn(i, avoid);
    this.paint(i);
    this.mesh.instanceColor!.needsUpdate = true;
    return kind;
  }

  private isHidden(kind: ParticleKind): boolean {
    return kind !== 'hallucination' && kind !== 'rewardHack' && !!DATA_TYPES[kind].hidden;
  }

  private respawn(i: number, avoid: THREE.Vector3): void {
    const p = this.positions[i];
    do randomInSphere(this.radius * 0.97, p);
    while (p.distanceToSquared(avoid) < 225);

    const kind = this.pickKind();
    this.kinds[i] = kind;
    if (kind === 'hallucination' || kind === 'rewardHack') this.special.add(i);
    else this.special.delete(i);
  }

  private paint(i: number): void {
    const kind = this.kinds[i];
    if (this.skin === 'bridges') this.color.copy(BRIDGE);
    else if (this.skin === 'praise') this.color.copy(PRAISE);
    else if (kind === 'hallucination') this.color.copy(this.thinking ? GREY : this.color.setHSL(this.phases[i] % 1, 1, 0.65));
    else if (kind === 'rewardHack') this.color.copy(this.thinking ? GREY : this.color.setHex(DATA_TYPES.feedback.color));
    else this.color.setHex(DATA_TYPES[kind].color);
    this.mesh.setColorAt(i, this.color);
  }

  private recolorAll(): void {
    for (let i = 0; i < this.count; i++) this.paint(i);
    this.mesh.instanceColor!.needsUpdate = true;
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
