import * as THREE from 'three';
import { PARTS } from '../config/parts';
import type { ModelForm, PartId } from '../config/types';
import type { SkinSpec } from '../config/achievements';
import { makeLabel } from './labels';
import { Eyes, INK_COLOR, outline, toonMat } from './toon';

/** The player's creature: a cartoon blob that grows freckles and sprouts parts as it evolves. */
export class Player {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  size = 1;
  /** Extra scale from size forms (e.g. Haiku / Sonnet / Opus). */
  formScale = 1;
  private targetSize = 1;
  /** Faces the direction of travel (front is -z). */
  private readonly body = new THREE.Group();
  /** Squash and stretch applies here, not to the heading. */
  private readonly squash = new THREE.Group();
  private readonly partsGroup = new THREE.Group();
  private readonly accessory = new THREE.Group();
  private readonly bodyMat = toonMat(0x7fd4ff, 0.22);
  private readonly spotMat = toonMat(0xffffff, 0.1);
  private readonly bodyMesh: THREE.Mesh;
  private readonly eyes: Eyes;
  private readonly mouth: THREE.Mesh;
  private spots: THREE.Mesh[] = [];
  private readonly aura: THREE.Mesh;
  private readonly beam: THREE.Mesh;
  private readonly trail: THREE.Sprite[] = [];
  private trailIndex = 0;
  private trailTimer = 0;
  private chomp = 0;
  private hurt = 0;
  private readonly heading = new THREE.Quaternion();
  private readonly look = new THREE.Matrix4();
  private readonly zero = new THREE.Vector3();
  private readonly lookLocal = new THREE.Vector3();
  private skin: SkinSpec | null = null;
  thinking = false;
  grabbing = false;
  trailMark: string | null = null;

  constructor(private readonly scene: THREE.Scene) {
    this.bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), this.bodyMat);
    outline(this.bodyMesh, 0.05);
    this.eyes = new Eyes(0.26, 0.3, 0x7fd4ff);
    this.eyes.group.position.set(0, 0.28, -0.8);
    this.eyes.group.rotation.y = Math.PI;
    this.mouth = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.06, 8, 20, Math.PI),
      new THREE.MeshBasicMaterial({ color: INK_COLOR }),
    );
    this.mouth.position.set(0, -0.12, -0.95);
    this.mouth.rotation.set(0, 0, Math.PI);
    this.aura = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xb07bff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.BackSide }),
    );
    this.aura.visible = false;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.35, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xc6ff4d, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.beam.rotation.x = -Math.PI / 2;
    this.beam.visible = false;
    this.squash.add(this.bodyMesh, this.eyes.group, this.mouth, this.partsGroup, this.accessory);
    this.body.add(this.squash, this.aura, this.beam);
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
    this.setColor(this.skin?.color ?? form.color);
    for (const s of this.spots) this.squash.remove(s);
    // More freckles per version: a visible sign of growing capacity.
    this.spots = Array.from({ length: Math.min(24, 2 + formIndex) }, (_, i) => {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.09 + (i % 3) * 0.03, 10), this.spotMat);
      const dir = new THREE.Vector3().randomDirection();
      if (dir.z < -0.4) dir.z = Math.abs(dir.z); // keep the face clear
      dir.normalize();
      dot.position.copy(dir).multiplyScalar(1.005);
      dot.lookAt(dir.clone().multiplyScalar(2));
      this.squash.add(dot);
      return dot;
    });
  }

  setColor(color: number): void {
    this.bodyMat.color.setHex(color);
    this.bodyMat.emissive.setHex(color);
    const c = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.55);
    this.spotMat.color.copy(c);
    this.spotMat.emissive.copy(c);
  }

  /** Cosmetic skin: color and an accessory. */
  setSkin(skin: SkinSpec | null, formColor: number): void {
    this.skin = skin;
    this.setColor(skin?.color ?? formColor);
    this.accessory.clear();
    const acc = skin?.accessory ?? 'none';
    if (acc === 'partyHat') {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.8, 16), toonMat(0xff5ca8, 0.2));
      hat.position.set(0, 1.25, 0);
      hat.rotation.z = 0.2;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toonMat(0xfff36b, 0.3));
      pom.position.y = 0.45;
      hat.add(pom);
      this.accessory.add(outline(hat, 0.08));
    } else if (acc === 'shades') {
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.08), new THREE.MeshBasicMaterial({ color: INK_COLOR }));
        lens.position.set(0.3 * s, 0.3, -1.02);
        this.accessory.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: INK_COLOR }));
      bridge.position.set(0, 0.33, -1.03);
      this.accessory.add(bridge);
    } else if (acc === 'bowtie') {
      for (const s of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.32, 3), toonMat(0xff4d4d, 0.2));
        wing.rotation.z = (Math.PI / 2) * s;
        wing.position.set(0.18 * s, -0.55, -0.82);
        this.accessory.add(outline(wing, 0.1));
      }
    } else if (acc === 'crown') {
      const mat = toonMat(0xffd84d, 0.35);
      mat.side = THREE.DoubleSide;
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.32, 6, 1, true), mat);
      crown.position.y = 1.08;
      this.accessory.add(crown);
    } else if (acc === 'halo') {
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: 0xfff6b0 }));
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 1.35;
      this.accessory.add(halo);
    }
  }

  /** Rebuilds the visible parts: limbs, eyes, tail, fins, crown, shell, antenna. */
  setParts(ids: PartId[], disabled: Set<PartId>): void {
    this.partsGroup.clear();
    let limbSide = 1;
    for (const id of ids) {
      const part = PARTS[id];
      if (!part) continue;
      const mat = toonMat(disabled.has(id) ? 0x555566 : part.color, 0.25);
      const g = new THREE.Group();
      g.userData.slot = part.slot;
      switch (part.slot) {
        case 'limb': {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 8), mat);
          arm.position.set(0, -0.45, 0);
          const claw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat);
          claw.position.set(0, -0.95, 0);
          g.add(arm, claw);
          g.position.set(0.8 * limbSide, -0.2, -0.2);
          g.rotation.z = 0.7 * limbSide;
          g.userData.side = limbSide;
          limbSide = -limbSide;
          break;
        }
        case 'eyes':
          for (const s of [-1, 1]) {
            const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 6), mat);
            stalk.position.set(0.45 * s, 0.95, -0.4);
            stalk.rotation.z = -0.4 * s;
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
            eye.position.set(0.56 * s, 1.2, -0.45);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: INK_COLOR }));
            pupil.position.set(0, 0, -0.12);
            eye.add(pupil);
            g.add(stalk, eye);
          }
          break;
        case 'tail':
          for (let i = 0; i < 5; i++) {
            const seg = new THREE.Mesh(new THREE.SphereGeometry(0.24 - i * 0.035, 10, 8), mat);
            seg.position.set(0, 0, 1 + i * 0.34);
            g.add(seg);
          }
          break;
        case 'fin':
          for (const s of [-1, 1]) {
            const fin = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 3), mat);
            fin.rotation.z = (-Math.PI / 2) * s;
            fin.scale.set(1, 1, 0.3);
            fin.position.set(1.05 * s, 0, 0.2);
            g.add(fin);
          }
          break;
        case 'crown': {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 8, 24), mat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = 1.02;
          g.add(ring);
          break;
        }
        case 'shell': {
          const shell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.22, 1),
            new THREE.MeshBasicMaterial({ color: part.color, wireframe: true, transparent: true, opacity: disabled.has(id) ? 0.12 : 0.45 }),
          );
          g.add(shell);
          break;
        }
        case 'antenna': {
          const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7, 6), mat);
          stalk.position.y = 1.2;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat);
          bulb.position.y = 1.62;
          g.add(stalk, bulb);
          break;
        }
      }
      if (part.slot !== 'shell') outline(g, 0.1);
      this.partsGroup.add(g);
    }
  }

  /** Mouth chomp when eating. */
  eat(): void {
    this.chomp = 1;
  }

  /** A red flash when hit. */
  ouch(): void {
    this.hurt = 1;
  }

  update(dt: number, t: number, reducedMotion = false): void {
    this.size += (this.targetSize - this.size) * Math.min(1, dt * 1.5);
    const speed = this.velocity.length();
    // Squash and stretch: long when fast, a wobble when idle.
    const stretch = reducedMotion ? 1 : 1 + Math.min(0.22, speed / 120) + Math.sin(t * 3) * 0.02;
    this.body.scale.setScalar(this.radius);
    this.squash.scale.set(1 / Math.sqrt(stretch), 1 / Math.sqrt(stretch), stretch);

    if (speed > 1) {
      this.look.lookAt(this.zero, this.velocity, THREE.Object3D.DEFAULT_UP);
      this.heading.setFromRotationMatrix(this.look);
      this.body.quaternion.slerp(this.heading, Math.min(1, dt * 5));
    }
    this.lookLocal.set(Math.sin(t * 0.7) * 0.4, Math.cos(t * 0.5) * 0.3, 0);
    this.eyes.update(t, this.lookLocal);

    this.chomp = Math.max(0, this.chomp - dt * 5);
    const open = Math.sin(this.chomp * Math.PI);
    this.mouth.scale.set(1 + open * 0.3, 1 + open * 2.2, 1);
    this.hurt = Math.max(0, this.hurt - dt * 2.5);
    this.bodyMat.emissive.copy(this.bodyMat.color).lerp(new THREE.Color(1, 0.15, 0.2), this.hurt);
    this.bodyMat.emissiveIntensity = 0.22 + this.hurt * 0.6;

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
        const s = makeLabel(this.trailMark, '#fff8ec');
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
