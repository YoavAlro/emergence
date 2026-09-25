import * as THREE from 'three';
import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import type { Mix } from '../config/models';
import { randomInSphere } from './Ocean';

export type ParticleKind = DataTypeId | 'hallucination';

/** Thousands of edible data particles, drawn as one InstancedMesh. */
export class DataField {
  readonly mesh: THREE.InstancedMesh;
  private readonly kinds: ParticleKind[];
  private readonly positions: THREE.Vector3[];
  private readonly phases: Float32Array;
  private readonly hallucinations = new Set<number>();
  private table: { kind: ParticleKind; weight: number }[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();

  constructor(private readonly count: number, private readonly radius: number) {
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
  configure(spawn: Mix, hallucinationRate: number, avoid: THREE.Vector3): void {
    this.table = Object.entries(spawn).map(([kind, weight]) => ({
      kind: kind as DataTypeId,
      weight: (weight ?? 0) * (1 - hallucinationRate),
    }));
    if (hallucinationRate > 0) this.table.push({ kind: 'hallucination', weight: hallucinationRate });
    this.hallucinations.clear();
    for (let i = 0; i < this.count; i++) this.respawn(i, avoid);
    this.mesh.instanceColor!.needsUpdate = true;
  }

  update(t: number): void {
    for (let i = 0; i < this.count; i++) {
      const phase = this.phases[i];
      this.dummy.position.copy(this.positions[i]);
      this.dummy.position.y += Math.sin(t * 0.8 + phase) * 0.4;
      this.dummy.rotation.set(t * 0.5 + phase, t * 0.3 + phase, 0);
      this.dummy.scale.setScalar(this.kinds[i] === 'hallucination' ? 1.3 : 1);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    for (const i of this.hallucinations) {
      this.mesh.setColorAt(i, this.color.setHSL((t * 0.4 + this.phases[i]) % 1, 1, 0.65));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.hallucinations.size) this.mesh.instanceColor!.needsUpdate = true;
  }

  /** Eats every particle within `reach` of `center`, returning what was eaten. */
  collect(center: THREE.Vector3, reach: number): ParticleKind[] {
    const eaten: ParticleKind[] = [];
    const reachSq = reach * reach;
    for (let i = 0; i < this.count; i++) {
      if (this.positions[i].distanceToSquared(center) < reachSq) {
        eaten.push(this.kinds[i]);
        this.respawn(i, center);
      }
    }
    if (eaten.length) this.mesh.instanceColor!.needsUpdate = true;
    return eaten;
  }

  private respawn(i: number, avoid: THREE.Vector3): void {
    const p = this.positions[i];
    do randomInSphere(this.radius * 0.97, p);
    while (p.distanceToSquared(avoid) < 225);

    const kind = this.pickKind();
    this.kinds[i] = kind;
    if (kind === 'hallucination') {
      this.hallucinations.add(i);
    } else {
      this.hallucinations.delete(i);
      this.mesh.setColorAt(i, this.color.setHex(DATA_TYPES[kind].color));
    }
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
