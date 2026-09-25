import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { DATA_TYPES, type DataTypeId } from '../config/dataTypes';
import { OPENAI_FORMS } from '../config/models';
import { writeSave, type SaveData } from '../save';
import { showFactCard } from '../ui/FactCard';
import { Hud } from '../ui/Hud';
import { DataField } from './DataField';
import { Input } from './Input';
import { Ocean } from './Ocean';
import { Player } from './Player';
import { Progress } from './Progress';
import { Rivals } from './Rivals';
import { Smog } from './Smog';

const WORLD_RADIUS = 90;
const LOOK_SPEED = 0.005;
const MAX_PITCH = 1.3;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly timer = new THREE.Timer();
  private readonly isTouch = Input.isTouchDevice();

  private readonly input: Input;
  private readonly ocean: Ocean;
  private readonly field: DataField;
  private readonly player: Player;
  private readonly rivals: Rivals;
  private readonly smog: Smog;
  private readonly progress: Progress;
  private readonly hud: Hud;

  private paused = true;
  private yaw = 0;
  private pitch = 0;
  private compute = 100;
  private toxicity = 0;
  private driftUntil = 0;
  private invulnerableUntil = 0;
  private hudTimer = 0;
  private readonly seenTypes = new Set<DataTypeId>();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();

  constructor(private readonly root: HTMLElement, save: SaveData) {
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.isTouch, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isTouch ? 1.5 : 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    root.append(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.1, 0.55, 0.12);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    root.append(overlay);

    this.input = new Input(this.renderer.domElement, overlay);
    this.ocean = new Ocean(this.scene, WORLD_RADIUS, this.isTouch ? 1500 : 3000);
    this.field = new DataField(this.isTouch ? 900 : 1800, WORLD_RADIUS);
    this.scene.add(this.field.mesh);
    this.player = new Player(this.scene);
    this.rivals = new Rivals(this.scene, WORLD_RADIUS);
    this.smog = new Smog(this.scene, WORLD_RADIUS);
    this.progress = new Progress(OPENAI_FORMS, Math.min(save.formIndex, OPENAI_FORMS.length - 1));
    this.hud = new Hud(overlay, this.isTouch, (held) => {
      this.input.boostHeld = held;
      this.input.boost = held;
    });

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.setupEra(true);
  }

  async start(): Promise<void> {
    this.renderer.setAnimationLoop((time) => this.frame(time));
    const form = this.progress.current;
    await showFactCard(this.root, { card: form.fact, color: form.color, button: 'Start training' });
    this.paused = false;
  }

  private setupEra(instant = false): void {
    const { current, next, formIndex } = this.progress;
    this.player.setForm(current, formIndex, instant);
    const era = next ?? current;
    this.field.configure(era.spawn, era.hallucinationRate, this.player.position);
    this.rivals.configure(next?.rivals ?? [], (next?.size ?? current.size) * 1.3, this.player.position);
    this.smog.configure(era.smogClouds, this.player.position);
    this.seenTypes.clear();
  }

  private frame(time: number): void {
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();

    if (!this.paused) this.simulate(dt, t);
    this.ocean.update(t);
    this.field.update(t);
    this.player.update(this.paused ? 0 : dt, t);
    this.smog.update(dt, t);
    this.placeCamera();
    this.composer.render();

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.hud.update({
        form: this.progress.current,
        next: this.progress.next,
        eaten: this.progress.eaten,
        mix: this.progress.mix(),
        accuracy: this.progress.accuracy(),
        hint: this.progress.hint(),
        compute: this.compute,
        toxicity: this.toxicity,
      });
    }
  }

  private simulate(dt: number, t: number): void {
    this.steer(dt, t);
    this.rivals.update(dt, t, this.player.position);
    this.eat(t);
    this.checkHazards(dt, t);
    if (this.progress.canEvolve()) void this.evolve();
  }

  private steer(dt: number, t: number): void {
    this.input.update();
    const look = this.input.consumeLook();
    this.yaw -= look.dx * LOOK_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch - look.dy * LOOK_SPEED, -MAX_PITCH, MAX_PITCH);

    let { x, y } = this.input.move;
    if (t < this.driftUntil) {
      // Hallucinating: controls wander off on their own.
      const a = Math.sin(t * 4) * 1.4;
      [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    }

    const boosting = this.input.boost && this.compute > 1 && (x !== 0 || y !== 0);
    this.compute = THREE.MathUtils.clamp(this.compute + (boosting ? -30 : 12) * dt, 0, 100);
    const speed = (10 + this.player.size * 2) * (boosting ? 1.9 : 1);

    this.lookDirection(this.forward);
    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();
    this.desired.copy(this.forward).multiplyScalar(y).addScaledVector(this.right, x);
    if (this.desired.lengthSq() > 1) this.desired.normalize();
    this.player.velocity.lerp(this.desired.multiplyScalar(speed), Math.min(1, dt * 4));

    const pos = this.player.position;
    if (pos.length() > WORLD_RADIUS) {
      pos.setLength(WORLD_RADIUS);
      this.player.velocity.multiplyScalar(-0.3);
      this.hud.toast('The edge of the dataset. Nothing out there yet.');
    }
  }

  private eat(t: number): void {
    const eaten = this.field.collect(this.player.position, this.player.size * 1.25 + 0.4);
    for (const kind of eaten) {
      if (kind === 'hallucination') {
        this.progress.loseAny(3);
        this.driftUntil = t + 4;
        this.hud.toast('Hallucination! You confidently learned something false.', 'bad');
        continue;
      }
      this.progress.add(kind);
      if (!this.seenTypes.has(kind)) {
        this.seenTypes.add(kind);
        this.hud.toast(DATA_TYPES[kind].blurb, 'info', 0);
      }
    }
  }

  private checkHazards(dt: number, t: number): void {
    const inSmog = this.smog.contains(this.player.position);
    this.toxicity = THREE.MathUtils.clamp(this.toxicity + (inSmog ? 22 : -6) * dt, 0, 100);
    if (inSmog) this.hud.toast('Toxic data: spam and hate speech. Get out before it sticks.', 'bad');
    if (this.toxicity >= 100) {
      this.toxicity = 0;
      this.progress.loseFraction(0.25);
      this.hud.toast('PR scandal! Toxic outputs went viral. You lost 25% of your training data.', 'bad', 0);
    }

    if (t < this.invulnerableUntil) return;
    const rival = this.rivals.hitTest(this.player.position, this.player.size);
    if (rival) {
      this.invulnerableUntil = t + 2;
      this.progress.loseFraction(0.15);
      this.rivals.repel(rival, this.player.position);
      this.player.velocity.subVectors(this.player.position, rival.group.position).setLength(20);
      this.hud.toast(`Outcompeted! ${rival.spec.blurb}`, 'bad', 0);
    }
  }

  private async evolve(): Promise<void> {
    this.paused = true;
    const mine = this.progress.mix();
    const next = this.progress.next!;
    this.progress.evolve();
    writeSave({ lineage: 'openai', formIndex: this.progress.formIndex });
    await showFactCard(this.root, { card: next.fact, color: next.color, diet: { mine, real: next.recipe } });
    this.setupEra();
    this.toxicity = 0;
    if (!this.progress.next) {
      this.hud.toast('Stage 1 complete! Alignment and Deployment are coming next.', 'good', 0);
    }
    this.paused = false;
  }

  private lookDirection(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  private placeCamera(): void {
    const dir = this.lookDirection(this.forward);
    const dist = 7 + this.player.size * 3.2;
    this.camera.position.copy(this.player.position).addScaledVector(dir, -dist);
    this.camera.position.y += dist * 0.25;
    this.camera.lookAt(this.lookTarget.copy(this.player.position).addScaledVector(dir, 3));
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.fov = w < h ? 80 : 65;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w / 2, h / 2);
  }
}
