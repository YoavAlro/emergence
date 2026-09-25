import * as THREE from 'three';
import type { SkinSpec } from '../config/achievements';
import type { HeroStyle } from '../config/labs';
import { PARTS } from '../config/parts';
import type { ModelForm, PartId } from '../config/types';
import { drawAura, drawHero, type HeroLook } from '../ui/creatures';
import { hexCss, makeLabel } from './labels';
import { Doodle, frames } from './sprites';

type Pose = 'idle' | 'chomp' | 'blink';

/**
 * The player's hero: a flat, hand-drawn sprite in its lab's colors. It grows,
 * sprouts a crest, freckles, and editor parts as it evolves, and squashes and
 * leans as it swims.
 */
export class Player {
  readonly group = new THREE.Group();
  readonly velocity = new THREE.Vector3();
  size = 1;
  /** Extra scale from size forms (e.g. Haiku / Sonnet / Opus). */
  formScale = 1;
  private targetSize = 1;
  private readonly hero: Doodle;
  private readonly aura: Doodle;
  /** Faces the direction of travel; carries the grab beam. */
  private readonly heading = new THREE.Group();
  private readonly beam: THREE.Mesh;
  private readonly trail: THREE.Sprite[] = [];
  private trailIndex = 0;
  private trailTimer = 0;
  private chomp = 0;
  private hurt = 0;
  private nextBlink = 2;
  private blinkUntil = 0;
  private readonly look = new THREE.Matrix4();
  private readonly zero = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private skin: SkinSpec | null = null;
  private stage = 1;
  private formIndex = 0;
  private parts: { id: PartId; disabled: boolean }[] = [];
  private poses: Record<Pose, THREE.Texture[]> | null = null;
  private pose: Pose = 'idle';
  /** Screen-space lean from steering (radians). */
  lean = 0;
  thinking = false;
  grabbing = false;
  trailMark: string | null = null;

  constructor(private readonly scene: THREE.Scene, private readonly style: HeroStyle) {
    this.hero = new Doodle(frames('idle-placeholder', () => {}), 1);
    this.hero.sprite.renderOrder = 2;
    this.aura = new Doodle(frames('aura', drawAura), 1.6, { opacity: 0.9 });
    this.aura.sprite.visible = false;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.35, 1, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xc6ff4d, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.beam.rotation.x = -Math.PI / 2;
    this.beam.visible = false;
    this.heading.add(this.beam);
    this.group.add(this.hero.sprite, this.aura.sprite, this.heading);
    scene.add(this.group);
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }

  /** Effective radius including the size form. */
  get radius(): number {
    return this.size * this.formScale;
  }

  /** The idle look, for sub-agent forks that look like you. */
  get idleFrames(): THREE.Texture[] {
    return this.poses?.idle ?? [];
  }

  setForm(form: ModelForm, formIndex: number, instant = false): void {
    this.targetSize = form.size;
    if (instant) this.size = form.size;
    this.stage = form.stage;
    this.formIndex = formIndex;
    this.redraw();
  }

  /** Cosmetic skin: color and an accessory. */
  setSkin(skin: SkinSpec | null, _formColor?: number): void {
    this.skin = skin;
    this.redraw();
  }

  /** Editor parts, drawn onto the hero (disabled ones in grey). */
  setParts(ids: PartId[], disabled: Set<PartId>): void {
    this.parts = ids.filter((id) => PARTS[id]).map((id) => ({ id, disabled: disabled.has(id) }));
    this.redraw();
  }

  private redraw(): void {
    const base: Omit<HeroLook, 'mouthOpen' | 'blink' | 'frame'> = {
      style: this.style,
      body: this.skin?.color !== undefined ? hexCss(this.skin.color) : undefined,
      stage: this.stage,
      freckles: 2 + this.formIndex,
      parts: this.parts.map((p) => ({ slot: PARTS[p.id].slot, color: p.disabled ? '#8a8699' : hexCss(PARTS[p.id].color) })),
      accessory: this.skin?.accessory ?? 'none',
    };
    const key = JSON.stringify(base);
    const make = (pose: Pose) =>
      frames(`hero:${pose}:${key}`, (ctx, frame) => drawHero(ctx, { ...base, mouthOpen: pose === 'chomp', blink: pose === 'blink', frame }));
    this.poses = { idle: make('idle'), chomp: make('chomp'), blink: make('blink') };
    this.hero.setLooks(this.poses[this.pose]);
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

    // Squash and stretch: tall when fast, a gentle bob when idle.
    const stretch = reducedMotion ? 1 : 1 + Math.min(0.18, speed / 140) + Math.sin(t * 3) * 0.025;
    const chompSquash = 1 + Math.sin(this.chomp * Math.PI) * 0.12;
    this.hero.radius = this.radius;
    this.hero.squashX = chompSquash / Math.sqrt(stretch);
    this.hero.squashY = stretch / chompSquash;
    this.hero.material.rotation = reducedMotion ? 0 : this.lean;

    this.chomp = Math.max(0, this.chomp - dt * 5);
    if (t > this.nextBlink) {
      this.blinkUntil = t + 0.13;
      this.nextBlink = t + 2 + Math.random() * 3.5;
    }
    const pose: Pose = this.chomp > 0.3 ? 'chomp' : t < this.blinkUntil ? 'blink' : 'idle';
    if (pose !== this.pose && this.poses) {
      this.pose = pose;
      this.hero.setLooks(this.poses[pose]);
    }
    this.hero.update(t);
    this.hurt = Math.max(0, this.hurt - dt * 2.5);
    this.hero.material.color.setRGB(1, 1 - this.hurt * 0.6, 1 - this.hurt * 0.6);

    this.aura.sprite.visible = this.thinking;
    if (this.thinking) {
      this.aura.radius = this.radius * (1.55 + Math.sin(t * 5) * 0.05);
      this.aura.update(t);
    }

    if (speed > 1) {
      this.look.lookAt(this.zero, this.velocity, THREE.Object3D.DEFAULT_UP);
      this.q.setFromRotationMatrix(this.look);
      this.heading.quaternion.slerp(this.q, Math.min(1, dt * 5));
    }
    this.beam.visible = this.grabbing;
    if (this.grabbing) {
      const len = 3.5 * this.radius;
      this.beam.scale.set(this.radius, len, this.radius);
      this.beam.position.set(0, 0, -len / 2 - this.radius * 0.8);
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
