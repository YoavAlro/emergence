import * as THREE from 'three';
import { PARTS } from '../config/parts';
import type { ModelForm, PartId } from '../config/types';
import { makeLabel } from './labels';

/** The player's creature: a glowing cell that grows neurons and sprouts parts as it evolves. */
export class Player {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  size = 1;
  /** Extra scale from size forms (e.g. Haiku / Sonnet / Opus). */
  formScale = 1;
  private targetSize = 1;
  private readonly body = new THREE.Group();
  private readonly partsGroup = new THREE.Group();
  private readonly coreMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.75, roughness: 0.4 });
  private readonly nodeMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 0.5, roughness: 0.4 });
  private readonly membraneMat = new THREE.MeshStandardMaterial({
    transparent: true,
    opacity: 0.1,
    emissiveIntensity: 0.3,
    depthWrite: false,
  });
  private nodes: THREE.Mesh[] = [];
  private readonly nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
  private readonly aura: THREE.Mesh;
  private readonly beam: THREE.Mesh;
  private readonly trail: THREE.Sprite[] = [];
  private trailIndex = 0;
  private trailTimer = 0;
  private readonly heading = new THREE.Quaternion();
  private readonly look = new THREE.Matrix4();
  private readonly zero = new THREE.Vector3();
  thinking = false;
  grabbing = false;
  trailMark: string | null = null;

  constructor(private readonly scene: THREE.Scene) {
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 2), this.coreMat);
    const membrane = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), this.membraneMat);
    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xb07bff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.BackSide }),
    );
    this.aura.visible = false;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.35, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xc6ff4d, transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }),
    );
    this.beam.rotation.x = -Math.PI / 2;
    this.beam.visible = false;
    this.body.add(core, membrane, this.partsGroup, this.aura, this.beam);
    this.group.add(this.body);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** Effective radius including the size form. */
  get radius(): number {
    return this.size * this.formScale;
  }

  setForm(form: ModelForm, formIndex: number, instant = false): void {
    this.targetSize = form.size;
    if (instant) this.size = form.size;
    this.setColor(form.color);
    for (const n of this.nodes) this.body.remove(n);
    // More neurons per version: a visible sign of growing capacity.
    this.nodes = Array.from({ length: Math.min(36, 3 + formIndex * 2) }, () => {
      const node = new THREE.Mesh(this.nodeGeo, this.nodeMat);
      node.userData.orbit = new THREE.Vector3().randomDirection();
      node.userData.speed = 0.6 + Math.random() * 1.2;
      this.body.add(node);
      return node;
    });
  }

  setColor(color: number): void {
    for (const mat of [this.coreMat, this.membraneMat, this.nodeMat]) {
      mat.color.setHex(color);
      mat.emissive.setHex(color);
    }
  }

  /** Rebuilds the visible parts: limbs, eyes, tail, fins, crown, shell, antenna. */
  setParts(ids: PartId[], disabled: Set<PartId>): void {
    this.partsGroup.clear();
    let limbSide = 1;
    for (const id of ids) {
      const part = PARTS[id];
      if (!part) continue;
      const mat = new THREE.MeshStandardMaterial({
        color: part.color,
        emissive: part.color,
        emissiveIntensity: disabled.has(id) ? 0.1 : 1.1,
        transparent: disabled.has(id),
        opacity: disabled.has(id) ? 0.3 : 1,
      });
      const g = new THREE.Group();
      g.userData.slot = part.slot;
      switch (part.slot) {
        case 'limb': {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.9, 6), mat);
          arm.position.set(0, -0.45, 0);
          const claw = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), mat);
          claw.position.set(0, -0.95, 0);
          g.add(arm, claw);
          g.position.set(0.75 * limbSide, -0.2, -0.2);
          g.rotation.z = 0.7 * limbSide;
          g.userData.side = limbSide;
          limbSide = -limbSide;
          break;
        }
        case 'eyes':
          for (const s of [-1, 1]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mat);
            eye.position.set(0.28 * s, 0.25, -0.88);
            g.add(eye);
          }
          break;
        case 'tail':
          for (let i = 0; i < 5; i++) {
            const seg = new THREE.Mesh(new THREE.ConeGeometry(0.22 - i * 0.03, 0.45, 6), mat);
            seg.rotation.x = Math.PI / 2;
            seg.position.set(0, 0, 1 + i * 0.38);
            g.add(seg);
          }
          break;
        case 'fin':
          for (const s of [-1, 1]) {
            const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 3), mat);
            fin.rotation.z = (-Math.PI / 2) * s;
            fin.scale.set(1, 1, 0.25);
            fin.position.set(1.05 * s, 0, 0.2);
            g.add(fin);
          }
          break;
        case 'crown': {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 24), mat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 1.02;
          g.add(ring);
          break;
        }
        case 'shell': {
          const shell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.2, 1),
            new THREE.MeshBasicMaterial({ color: part.color, wireframe: true, transparent: true, opacity: disabled.has(id) ? 0.1 : 0.35 }),
          );
          g.add(shell);
          break;
        }
        case 'antenna': {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 4), mat);
          stalk.position.y = 1.2;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat);
          bulb.position.y = 1.6;
          g.add(stalk, bulb);
          break;
        }
      }
      this.partsGroup.add(g);
    }
  }

  update(dt: number, t: number): void {
    this.size += (this.targetSize - this.size) * Math.min(1, dt * 1.5);
    const pulse = 1 + Math.sin(t * 3) * 0.03;
    this.body.scale.setScalar(this.radius * pulse);

    if (this.velocity.lengthSq() > 1) {
      this.look.lookAt(this.zero, this.velocity, THREE.Object3D.DEFAULT_UP);
      this.heading.setFromRotationMatrix(this.look);
      this.body.quaternion.slerp(this.heading, Math.min(1, dt * 5));
    }

    this.nodes.forEach((node, i) => {
      const axis = node.userData.orbit as THREE.Vector3;
      const angle = t * (node.userData.speed as number) + i;
      node.position.set(Math.cos(angle), Math.sin(angle), 0).multiplyScalar(0.72);
      node.position.applyAxisAngle(axis, i);
    });
    for (const g of this.partsGroup.children) {
      if (g.userData.slot === 'limb') g.rotation.x = Math.sin(t * 4 + (g.userData.side as number)) * 0.4;
      if (g.userData.slot === 'fin') g.rotation.z = Math.sin(t * 6) * 0.25;
      if (g.userData.slot === 'tail') g.rotation.y = Math.sin(t * 3) * 0.35;
    }

    this.aura.visible = this.thinking;
    if (this.thinking) this.aura.scale.setScalar(1 + Math.sin(t * 5) * 0.08);
    this.beam.visible = this.grabbing;
    if (this.grabbing) {
      const len = 3.5;
      this.beam.scale.set(1, len, 1);
      this.beam.position.set(0, 0, -len / 2 - 0.8);
    }

    this.updateTrail(dt);
  }

  private updateTrail(dt: number): void {
    if (!this.trailMark) {
      for (const s of this.trail) s.visible = false;
      return;
    }
    if (this.trail.length === 0) {
      for (let i = 0; i < 16; i++) {
        const s = makeLabel(this.trailMark, '#e8ecff');
        s.visible = false;
        this.scene.add(s);
        this.trail.push(s);
      }
    }
    this.trailTimer -= dt;
    if (this.trailTimer <= 0 && this.velocity.lengthSq() > 4) {
      this.trailTimer = 0.25;
      const s = this.trail[this.trailIndex++ % this.trail.length];
      s.visible = true;
      s.position.copy(this.position).addScaledVector(this.velocity.clone().normalize(), -this.radius * 1.6);
      s.scale.set(this.radius * 2.4, this.radius * 0.6, 1);
      s.material.opacity = 1;
    }
    for (const s of this.trail) if (s.visible) s.material.opacity = Math.max(0, s.material.opacity - dt * 0.25);
  }
}
