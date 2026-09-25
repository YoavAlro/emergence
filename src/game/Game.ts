import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SKINS, type AchievementSpec, type StatKey } from '../config/achievements';
import { DATA_TYPES, DATA_TYPE_IDS, bucketOf, type DataTypeId } from '../config/dataTypes';
import { EVENTS } from '../config/events';
import { LINEAGES } from '../config/models';
import { RECURRING_GAGS, TIMELINE_POSTS } from '../config/timeline';
import type { AbilityId, EventSpec, Lineage, ModelForm, Modifiers, PickupEffect, RecurringGag, SizeFormSpec } from '../config/types';
import { ABILITY_INTRO, DANGER_TEXT, GATE_HINTS, INTERNET_BIOME, USER_MARKET } from '../config/world';
import { clearSave, writeSave, writeSettings, type SaveData, type Settings } from '../save';
import { showEditor } from '../ui/Editor';
import { isAutoModals, modalOpen, setAutoModals, showChoice, showFactCard } from '../ui/FactCard';
import { Hud, KIND_LABEL, type HudEvent } from '../ui/Hud';
import { showMenu } from '../ui/Menu';
import { playMiniGame } from '../ui/MiniGames';
import { showRecap } from '../ui/RecapScreen';
import { showTrophies } from '../ui/Trophies';
import { Audio } from './Audio';
import { Boss } from './Boss';
import { boilEmblems } from './critter';
import { DataField, type ParticleKind } from './DataField';
import { EventDirector, GagTimer, type ActiveEvent } from './EventDirector';
import { Hunters } from './Hunters';
import { Input, type Action } from './Input';
import { Juice } from './Juice';
import { Meta } from './Meta';
import { Ocean, type OceanMood } from './Ocean';
import { Beacons, Pickups, type Pickup } from './Pickups';
import { Player } from './Player';
import { Portals } from './Portals';
import { Progress } from './Progress';
import { buildRecap } from './Recap';
import { Rivals } from './Rivals';
import { Score } from './Score';
import { RunState, combineModifiers, gateChecks, rolloutPhase, formatUsers, type Combined } from './RunState';
import { Smog } from './Smog';
import { Swarm } from './Swarm';
import { FORK_COST, leakCount, maxForks } from './swarmRules';
import { TimelineCurrent } from './TimelineCurrent';

const WORLD_RADIUS = 90;
const LOOK_SPEED = 0.005;
const MAX_PITCH = 1.3;
/** Think mode slows the world to this fraction of normal speed. */
const THINK_TIME_SCALE = 0.35;
const THINK_COST = 9;
const GRAB_COST = 12;
const BOOST_COST = 30;
const COMPUTE_REGEN = 12;
const REWARD_HACK_RATE_FROM_STAGE = 5;

interface EventRuntime {
  active: ActiveEvent;
  betPlaced: boolean;
  bubbleTimer: number;
  dropTimer: number;
  postIndex: number;
  closedMesh: THREE.Mesh | null;
  autopilot: THREE.Vector3 | null;
  intensified: boolean;
}

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly timer = new THREE.Timer();
  private readonly isTouch = Input.isTouchDevice();
  private readonly lowQuality: boolean;

  private readonly input: Input;
  private readonly ocean: Ocean;
  private readonly field: DataField;
  private readonly player: Player;
  private readonly rivals: Rivals;
  private readonly smog: Smog;
  private readonly current: TimelineCurrent;
  private readonly pickups: Pickups;
  private readonly beacons: Beacons;
  private readonly hunters: Hunters;
  private readonly swarm: Swarm;
  private readonly portals: Portals;
  private readonly audio: Audio;
  private readonly hud: Hud;
  private readonly forms: ModelForm[];
  private readonly progress: Progress;
  private readonly director = new EventDirector(EVENTS);
  private readonly juice: Juice;
  private readonly meta = Meta.load();
  /** This lineage's high score before this run (the HUD's "Best"). */
  private startBest = 0;
  private readonly score = new Score();
  private boss: { fight: Boss; eventId: string; tauntTimer: number } | null = null;
  private boosting = false;
  private readonly eatWhere: THREE.Vector3[] = [];
  /** Seconds of thinking / riding not yet added to lifetime stats. */
  private statSeconds = { think: 0, current: 0 };
  private run: RunState;
  private gag: { timer: GagTimer; spec: RecurringGag } | null = null;

  private paused = true;
  private busy = false;
  private finished = false;
  private yaw = 0;
  private pitch = 0;
  private driftUntil = 0;
  private invulnerableUntil = 0;
  private hudTimer = 0;
  private postTimer = 0;
  private eraSeconds = 0;
  private eatTimes: number[] = [];
  private lastScreenshot = 0;
  private thinking = false;
  private grabbing = false;
  private sizeFormIndex = 0;
  private internetUntil = 0;
  private hangover: { rate: number; until: number } | null = null;
  private betMods: Modifiers[] = [];
  private evt: EventRuntime | null = null;
  private rollout: { phase: number; beaconsSpawned: boolean } | null = null;
  private mods: Combined = combineModifiers([]);
  private abilities = new Set<AbilityId>();
  private riding = false;
  private tRef = 0;
  private readonly seenTypes = new Set<DataTypeId>();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly lastPos = new THREE.Vector3();
  private speedNow = 0;
  /** Debug: simulation substeps per frame, and an autopilot that eats what the recipe needs. */
  private simSteps = 1;
  /** Debug: how often each danger cost you data. */
  private readonly losses: Record<string, number> = {};
  private lost(cause: string): void {
    this.losses[cause] = (this.losses[cause] ?? 0) + 1;
  }
  private bot = false;
  /** Adaptive quality: drop the pixel ratio when frames run slow. */
  private fpsWindow = { frames: 0, time: 0 };
  private pixelRatio = 1;
  private botFrame = 0;
  private botLastEat = 0;
  private botLastEaten = 0;
  private botWander: THREE.Vector3 | null = null;
  private botWanderUntil = 0;

  constructor(
    private readonly root: HTMLElement,
    save: SaveData,
    private readonly settings: Settings,
    debug = false,
  ) {
    this.lowQuality = settings.quality === 'low' || (settings.quality === 'auto' && this.isTouch);
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowQuality, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio, this.lowQuality ? 1.25 : 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    // Neutral tone mapping keeps cartoon colors saturated (ACES washes them out).
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    root.append(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // Just a hint of glow on the brightest bits: the look is ink and paint, not neon.
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.25, 0.4, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    root.append(overlay);

    this.forms = LINEAGES[save.lineage].forms;
    this.input = new Input(this.renderer.domElement, overlay);
    this.ocean = new Ocean(this.scene, WORLD_RADIUS, this.lowQuality ? 1200 : 3000);
    this.field = new DataField(this.lowQuality ? 1000 : 1800, WORLD_RADIUS, (this.scene.fog as THREE.FogExp2).color);
    this.scene.add(this.field.mesh);
    this.player = new Player(this.scene);
    this.juice = new Juice(this.scene, overlay, this.camera);
    this.rivals = new Rivals(this.scene, WORLD_RADIUS);
    this.smog = new Smog(this.scene, WORLD_RADIUS);
    this.current = new TimelineCurrent(this.scene, WORLD_RADIUS, this.lowQuality ? 90 : 180);
    this.pickups = new Pickups(this.scene, WORLD_RADIUS);
    this.beacons = new Beacons(this.scene, WORLD_RADIUS);
    this.hunters = new Hunters(this.scene, WORLD_RADIUS);
    this.swarm = new Swarm(this.scene, WORLD_RADIUS);
    this.portals = new Portals(this.scene, WORLD_RADIUS);
    this.audio = new Audio(settings.audio);
    this.progress = new Progress(this.forms, Math.min(save.formIndex, this.forms.length - 1));
    this.run = save.run ? RunState.fromJSON(save.run) : new RunState(save.lineage);
    for (const id of save.done ?? []) this.director.done.add(id);
    this.score.total = save.score ?? 0;
    this.startBest = this.meta.data.highScores[save.lineage] ?? 0;
    this.hud = new Hud(overlay, this.isTouch, (action, down) => this.onButton(action, down));
    this.applySettings();

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.setupEra(true);
    if (debug) this.installDebug();
  }

  private get lineage(): Lineage {
    return this.run.lineage;
  }

  async start(): Promise<void> {
    this.renderer.setAnimationLoop((time) => this.frame(time));
    const form = this.progress.current;
    if (this.progress.formIndex === 0) {
      await showFactCard(this.root, { card: form.fact, color: form.color, button: 'Start training' });
    } else {
      this.hud.showBanner(`Welcome back: ${form.name}`, 'Your run was saved at this form.', 'evolve');
    }
    this.paused = false;
  }

  // ---- era setup ------------------------------------------------------------

  private setupEra(instant = false): void {
    const { current, next, formIndex } = this.progress;
    this.player.setForm(current, formIndex, instant);
    this.player.setSkin(this.meta.skin.id === 'classic' ? null : this.meta.skin, current.color);
    const before = new Set(this.abilities);
    this.refreshAbilities();
    if (!instant) for (const a of this.abilities) if (!before.has(a) && ABILITY_INTRO[a]) this.hud.toast(this.keyText(ABILITY_INTRO[a]), 'good', 0);
    this.player.setParts(this.run.equipped, this.run.disabledParts);
    this.player.trailMark = this.run.lingering.find((l) => l.trail)?.trail ?? null;
    this.swarm.setColor(current.color);
    const era = next ?? current;
    const stage = current.stage;
    this.restock();
    this.current.enabled = this.abilities.has('timeline');
    this.portals.enabled = this.abilities.has('portals');
    this.rivals.configure(era.rivals, (era.size ?? current.size) * 1.3, this.player.position, () => this.current.randomPoint());
    this.smog.configure(era.smogClouds, this.player.position);
    this.hunters.configure(era.hunters ?? {}, this.player.position);
    this.seenTypes.clear();
    this.eraSeconds = 0;
    this.rollout = null;
    this.sizeFormIndex = 0;
    this.player.formScale = this.sizeForm()?.scale ?? 1;
    this.director.enterEra(this.lineage, current.id, this.run.flags);
    this.run.newEra();
    const gagSpec = RECURRING_GAGS.find((g) => g.lineage === this.lineage);
    const gagFrom = gagSpec ? this.forms.findIndex((f) => f.id === gagSpec.fromForm) : -1;
    this.gag = gagSpec && gagFrom >= 0 && formIndex >= gagFrom ? { timer: new GagTimer(gagSpec), spec: gagSpec } : null;
    void stage;
  }

  /** Fills {action} placeholders with the right control for this device. */
  private keyText(text: string): string {
    const keys: Record<string, [string, string]> = {
      editor: ['C', 'EDIT'],
      grab: ['E', 'GRAB'],
      think: ['Space', 'THINK'],
      fork: ['F', 'FORK'],
      target: ['T', 'TARGET'],
      recall: ['R', 'RECALL'],
      form: ['Q', 'FORM'],
    };
    return text.replace(/\{(\w+)\}/g, (_, k: string) => (keys[k] ? (this.isTouch ? keys[k][1] : keys[k][0]) : k));
  }

  /** Re-stocks the ocean for the era (or the internet biome while inside it). */
  private restock(): void {
    const { current, next } = this.progress;
    const era = next ?? current;
    let spawn = era.spawn;
    if (this.internetUntil > this.tRef) {
      spawn = { ...spawn };
      for (const [k, v] of Object.entries(INTERNET_BIOME.extraSpawn)) {
        const id = k as DataTypeId;
        spawn[id] = (spawn[id] ?? 0) + (v ?? 0);
      }
    }
    const rewardHack = current.stage >= REWARD_HACK_RATE_FROM_STAGE ? 0.04 : 0;
    this.field.configure(spawn, era.hallucinationRate, rewardHack, this.player.position);
  }

  private refreshAbilities(): void {
    const extra = [...this.run.permanent.map((p) => p.modifiers), ...this.betMods, ...(this.evt?.active.spec.modifiers ? [this.evt.active.spec.modifiers] : [])];
    this.abilities = RunState.abilities(this.forms, this.progress.formIndex, extra);
  }

  /** Size forms come from the latest form that defines them (e.g. Claude 3 or GPT-5.6). */
  private sizeForms(): SizeFormSpec[] {
    for (let i = this.progress.formIndex; i >= 0; i--) {
      const sf = this.forms[i].sizeForms;
      if (sf?.length) return sf;
    }
    return [];
  }

  private sizeForm(): SizeFormSpec | undefined {
    if (!this.abilities.has('sizeForms')) return undefined;
    const list = this.sizeForms();
    return list[this.sizeFormIndex % Math.max(1, list.length)];
  }

  // ---- main loop ------------------------------------------------------------

  private frame(time: number): void {
    this.timer.update(time);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();
    this.tRef = t;
    const worldScale = this.thinking ? THINK_TIME_SCALE : 1;

    for (let i = 0; i < this.simSteps; i++) if (!this.paused && !modalOpen()) this.simulate(dt, t);
    this.input.suspended = modalOpen() || this.paused;
    this.ocean.mood = this.moodFor();
    this.ocean.update(dt, t);
    this.field.update(t);
    this.player.update(this.paused || modalOpen() ? 0 : dt, t, this.settings.reducedMotion);
    this.juice.update(dt);
    boilEmblems(t, this.settings.reducedMotion);
    this.smog.update(dt * worldScale, t);
    this.current.update(dt * worldScale, t);
    this.beacons.update(t);
    this.portals.update(dt, t);
    this.placeCamera(t);
    this.juice.applyShake(this.camera, t);
    // Bot mode (playtime measurement) renders rarely so the simulation runs fast.
    if (!this.bot || (this.botFrame++ & 15) === 0) this.composer.render();

    this.adaptQuality(this.timer.getDelta());

    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hudTimer = 0.1;
      this.updateHud();
    }
  }

  /** Every 3 s: if we averaged under 40 fps, render at a lower resolution (down to 0.75×). */
  private adaptQuality(rawDelta: number): void {
    if (this.bot || this.settings.quality === 'high') return;
    const w = this.fpsWindow;
    w.frames++;
    w.time += rawDelta;
    if (w.time < 3) return;
    const fps = w.frames / w.time;
    w.frames = 0;
    w.time = 0;
    if (fps < 40 && this.pixelRatio > 0.75) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.composer.setPixelRatio(this.pixelRatio);
      this.resize();
    }
  }

  private moodFor(): OceanMood {
    if (this.thinking) return 'think';
    const lighting = this.evt?.active.spec.visuals?.lighting;
    if (lighting) return lighting;
    if (this.internetUntil > this.tRef) return 'internet';
    return 'normal';
  }

  private simulate(dt: number, t: number): void {
    this.run.log.playSeconds += dt;
    this.eraSeconds += dt;
    this.refreshAbilities();
    const sf = this.sizeForm();
    const list: Modifiers[] = [...this.run.baseModifiers(), ...this.betMods];
    const eraMods = this.progress.current.eraModifiers;
    if (eraMods) list.push(eraMods);
    if (this.evt?.active.spec.modifiers) list.push(this.evt.active.spec.modifiers);
    if (sf) list.push({ speed: sf.speed, reach: sf.reach, computeCost: sf.cost });
    if (this.internetUntil > t) list.push({ userGain: INTERNET_BIOME.userGain });
    if (this.lineage === 'claude' && this.abilities.has('constitution') && this.run.constitutionState() === 'overRefusing') list.push({ toxResist: 0.3 });
    this.mods = combineModifiers(list);
    this.player.formScale += ((sf?.scale ?? 1) - this.player.formScale) * Math.min(1, dt * 3);

    this.handleActions(t);
    this.steer(dt, t);
    const worldScale = this.thinking ? THINK_TIME_SCALE : 1;
    this.rivals.update(dt * worldScale, t, this.player.position);
    this.hunters.update(dt * worldScale, t, this.player.position, 1);
    this.pickups.update(dt * worldScale, t, this.player.position, (p, pdt) => this.ridePickup(p, pdt));
    this.updateBoss(dt * worldScale, t);

    const reach = this.reach();
    // Magnets pull the types your target recipe wants (a part never lures you into decoys).
    const wanted = new Set([...this.mods.magnet].filter((t) => (this.progress.next?.recipe[t] ?? 0) > 0));
    if (wanted.size) this.field.attract(this.player.position, wanted, reach * 2, dt * 0.45);
    if (this.grabbing) this.field.attract(this.player.position, new Set(DATA_TYPE_IDS), reach * 5, dt * 2.5);
    this.eat(t);
    this.touchPickups();
    this.checkHazards(dt, t);
    this.updateCurrent(dt);
    this.updateMeters(dt, t);
    this.updateSwarm(dt);
    this.updateEvents(dt, t);
    this.updateGag(dt);
    this.updatePortals(t);
    this.checkEvolve();
    if (this.thinking) this.statSeconds.think += dt;
    if (this.riding) this.statSeconds.current += dt;
    if (this.statSeconds.think + this.statSeconds.current >= 1) {
      this.bump('thinkSeconds', this.statSeconds.think);
      this.bump('currentSeconds', this.statSeconds.current);
      this.statSeconds = { think: 0, current: 0 };
    }
  }

  // ---- score & achievements ---------------------------------------------------

  /** Adds to a lifetime stat and celebrates any achievement it unlocks. */
  private bump(key: StatKey, n = 1): void {
    const fresh = this.meta.bump(key, n);
    if (fresh.length) this.celebrate(fresh);
  }

  private celebrate(list: AchievementSpec[]): void {
    for (const a of list) {
      this.hud.trophy(a.name, a.desc);
      const skin = SKINS.find((k) => k.unlock === a.id);
      if (skin) this.hud.toast(`New skin unlocked: ${skin.name}! Pick it from the title screen or pause menu.`, 'good', 0);
    }
    this.audio.fanfare();
    this.meta.save();
  }

  /** A bonus with a big callout. */
  private bonusPoints(points: number, label: string): void {
    const p = this.score.bonus(points);
    if (p > 0) this.juice.callout(`+${p.toLocaleString('en-US')} ${label}`, 'bonus');
  }

  /** Something bad happened to you: shake, flash, and the combo breaks. */
  private ouch(strength = 0.5): void {
    const lost = this.score.break();
    this.juice.shake(strength);
    this.juice.flash('hit');
    this.player.ouch();
    if (lost >= 10) this.juice.popup(this.player.position, `Combo ×${lost} lost!`, 'bad');
  }

  private reach(): number {
    return this.player.radius * 1.25 * this.mods.reach + 0.4;
  }

  private costMult(): number {
    return this.mods.computeCost;
  }

  // ---- actions --------------------------------------------------------------

  private onButton(action: Action, down: boolean): void {
    if (action === 'boost' || action === 'think' || action === 'grab') this.input.hold(action, down);
    else if (down) this.input.tap(action);
  }

  private handleActions(t: number): void {
    const inp = this.input;
    if (inp.consumeTap('pause')) void this.openMenu();
    if (inp.consumeTap('editor')) void this.openEditor();
    if (inp.consumeTap('form') && this.abilities.has('sizeForms')) {
      const list = this.sizeForms();
      if (list.length) {
        this.sizeFormIndex = (this.sizeFormIndex + 1) % list.length;
        const sf = list[this.sizeFormIndex];
        this.hud.toast(`${sf.name}: ${sf.blurb}`, 'info', 0);
      }
    }
    if (inp.consumeTap('reset')) {
      if (this.run.useReset()) {
        this.hud.toast('Reset! Compute fully refilled. Have you tried turning it off and on again?', 'good', 0);
        this.audio.good();
        this.bump('resetsUsed');
      }
    }
    if (inp.consumeTap('bet')) this.placeBet();
    if (this.abilities.has('fork')) {
      if (inp.consumeTap('fork')) this.forkAgent();
      if (inp.consumeTap('target')) this.cycleTarget();
      if (inp.consumeTap('recall')) {
        const delivered = this.swarm.recall();
        this.processEaten(delivered, t, true);
        this.hud.toast(`Recalled your forks${delivered.length ? `: they brought back ${delivered.length} pieces` : ''}.`, 'info', 0);
      }
    } else {
      inp.consumeTap('fork');
      inp.consumeTap('target');
      inp.consumeTap('recall');
    }

    const wantThink = this.abilities.has('think') && inp.isHeld('think') && this.run.compute > 2;
    if (wantThink !== this.thinking) this.audio.think(wantThink);
    this.thinking = wantThink;
    this.field.thinking = wantThink;
    this.field.thinkFrom = this.player.position;
    this.hunters.thinking = wantThink;
    this.player.thinking = wantThink;
    this.grabbing = this.abilities.has('tools') && inp.isHeld('grab') && this.run.compute > 2;
    this.player.grabbing = this.grabbing;
  }

  private forkAgent(): void {
    const max = maxForks(this.mods.forkSlots, this.abilities.has('teams'));
    const cost = FORK_COST * this.costMult();
    if (this.swarm.forks.length >= max) return this.hud.toast(`All ${max} fork slots are busy. Even sub-agents need a manager. RECALL to free them.`, 'info');
    if (this.run.compute < cost) return this.hud.toast('Not enough compute to fork. The cloud bill says no.', 'bad');
    this.run.compute -= cost;
    this.swarm.fork(this.player.position);
    this.bump('forks');
    this.hud.toast(`Forked a sub-agent (${this.swarm.forks.length}/${max}). Target: ${this.targetName()}.`, 'info', 0);
  }

  private cycleTarget(): void {
    const next = this.progress.next;
    const options: (DataTypeId | null)[] = [null, ...((next ? Object.keys(next.recipe) : []) as DataTypeId[])];
    const i = options.indexOf(this.swarm.targetType);
    this.swarm.targetType = options[(i + 1) % options.length];
    this.hud.toast(`Forks now target: ${this.targetName()}`, 'info', 0);
  }

  private targetName(): string {
    return this.swarm.targetType ? DATA_TYPES[this.swarm.targetType].label : 'anything nearby';
  }

  private async openEditor(): Promise<void> {
    if (!this.abilities.has('editor') || this.busy) return;
    if (this.evt?.active.spec.locksEditor) return this.hud.toast(`The editor is locked during ${this.evt.active.spec.title}.`, 'bad');
    if (isAutoModals()) return;
    this.paused = true;
    const owned = this.run.ownedParts.size;
    await showEditor(this.root, this.run, RunState.availableParts(this.forms, this.progress.formIndex), this.progress.current.color, () =>
      this.player.setParts(this.run.equipped, this.run.disabledParts),
    );
    if (this.run.ownedParts.size > owned) this.bump('partsBought', this.run.ownedParts.size - owned);
    this.save();
    this.paused = false;
  }

  private async openMenu(): Promise<void> {
    if (this.busy) return;
    this.paused = true;
    let result = await showMenu(this.root, this.settings, (s) => {
      writeSettings(s);
      this.applySettings();
    }, this.meta);
    while (result === 'trophies') {
      await showTrophies(this.root, this.meta, () => this.player.setSkin(this.meta.skin.id === 'classic' ? null : this.meta.skin, this.progress.current.color));
      result = await showMenu(this.root, this.settings, (s) => {
        writeSettings(s);
        this.applySettings();
      }, this.meta);
    }
    if (result === 'quit') {
      this.save();
      location.reload();
      return;
    }
    this.paused = false;
  }

  private applySettings(): void {
    this.audio.setEnabled(this.settings.audio);
    document.documentElement.classList.toggle('large-text', this.settings.largeText);
    document.documentElement.classList.toggle('reduced-motion', this.settings.reducedMotion);
    this.bloom.strength = this.settings.reducedMotion ? 0.15 : 0.25;
    this.juice.reducedMotion = this.settings.reducedMotion;
  }

  // ---- movement -------------------------------------------------------------

  private steer(dt: number, t: number): void {
    this.input.update();
    const look = this.input.consumeLook();
    this.yaw -= look.dx * LOOK_SPEED;
    this.pitch = THREE.MathUtils.clamp(this.pitch - look.dy * LOOK_SPEED, -MAX_PITCH, MAX_PITCH);

    let { x, y } = this.input.move;
    if (this.bot) [x, y] = this.botSteer();
    if (this.mods.controls === 'locked') [x, y] = [0, 0];
    if (t < this.driftUntil || this.mods.controls === 'scrambled') {
      // Hallucinating or scrambled: controls wander off on their own.
      const a = Math.sin(t * (this.mods.controls === 'scrambled' ? 1.3 : 4)) * 1.6;
      [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    }

    const moving = x !== 0 || y !== 0;
    const boosting = this.input.isHeld('boost') && this.run.compute > 1 && moving;
    this.boosting = boosting;
    let computeUse = 0;
    if (boosting) computeUse += BOOST_COST;
    if (this.thinking) computeUse += THINK_COST * this.mods.thinkCost;
    if (this.grabbing) computeUse += GRAB_COST;
    const regen = COMPUTE_REGEN * this.mods.computeRegen;
    const delta = (computeUse ? -computeUse * this.costMult() : regen) + this.mods.computeDrain;
    this.run.compute = THREE.MathUtils.clamp(this.run.compute + delta * dt, 0, 100);
    if (this.run.compute === 0 && computeUse) this.hud.toast(DANGER_TEXT.computeEmpty, 'bad');
    const speed = (10 + this.player.radius * 2) * (boosting ? 1.9 : 1) * this.mods.speed * (this.thinking ? 0.7 : 1);

    this.lookDirection(this.forward);
    this.right.crossVectors(this.forward, THREE.Object3D.DEFAULT_UP).normalize();
    this.desired.copy(this.forward).multiplyScalar(y).addScaledVector(this.right, x);
    if (this.desired.lengthSq() > 1) this.desired.normalize();
    this.desired.multiplyScalar(speed);
    const auto = this.evt?.autopilot;
    if (auto) this.desired.add(this.lookTarget.subVectors(auto, this.player.position).setLength(speed * 0.8));
    this.player.velocity.lerp(this.desired, Math.min(1, dt * 4));
    this.player.position.addScaledVector(this.player.velocity, dt);

    const pos = this.player.position;
    if (pos.length() > WORLD_RADIUS) {
      pos.setLength(WORLD_RADIUS);
      this.player.velocity.multiplyScalar(-0.3);
      this.hud.toast(DANGER_TEXT.edge);
    }
    const closed = this.field.closed;
    if (closed && pos.distanceTo(closed.center) < closed.radius) {
      this.player.velocity.addScaledVector(this.lookTarget.subVectors(pos, closed.center).normalize(), 40 * dt);
    }
    this.speedNow = this.lastPos.distanceTo(pos) / Math.max(dt, 1e-3);
    this.lastPos.copy(pos);
  }

  /** Autopilot for playtime measurement: swim toward the most-needed data type. */
  private botSteer(): [number, number] {
    const pos = this.player.position;
    // Like a player using the editor: buy whatever parts are affordable, newest first.
    if (this.abilities.has('editor')) {
      for (const id of RunState.availableParts(this.forms, this.progress.formIndex).reverse()) {
        if (!this.run.ownedParts.has(id) && this.run.equip(id)) this.player.setParts(this.run.equipped, this.run.disabledParts);
      }
    }
    let goal: THREE.Vector3 | null = null;
    // Stuck (nothing eaten for a while)? Wander somewhere else for a few seconds.
    const now = this.run.log.playSeconds;
    if (this.progress.eaten !== this.botLastEaten) {
      this.botLastEaten = this.progress.eaten;
      this.botLastEat = now;
    }
    if (now - this.botLastEat > 8 && now > this.botWanderUntil) {
      this.botWander = new THREE.Vector3().randomDirection().multiplyScalar(WORLD_RADIUS * 0.6);
      this.botWanderUntil = now + 3;
      this.botLastEat = now;
    }
    if (now < this.botWanderUntil && this.botWander) goal = this.botWander;
    // Boss fight: bonk it while it's dizzy (boosting), otherwise keep away and keep eating.
    const fight = this.boss?.fight;
    if (fight?.dizzy) goal = fight.group.position;
    this.input.hold('boost', !!fight?.dizzy && this.run.compute > 10);
    // Rollout: go build trust at a partner hub.
    if (!fight?.dizzy && this.rollout && this.beacons.list.length) goal = this.beacons.list[0].group.position;
    // Event pickups (hearts, privacy controls...) first.
    const evId = this.director.active?.spec.id;
    if (!goal && evId) {
      const mine = this.pickups.list.filter((p) => p.eventId === evId && !p.bad);
      if (mine.length) goal = mine.reduce((a, b) => (a.sprite.position.distanceTo(pos) < b.sprite.position.distanceTo(pos) ? a : b)).sprite.position;
    }
    if (!goal && this.director.active?.spec.objective?.kind === 'stayNear' && this.beacons.list.length) goal = this.beacons.list[0].group.position;
    // Needs users: ride the Timeline Current, like the HUD hint says.
    if (!goal && this.current.enabled && this.gateList().some((g) => g.label === 'Users' && !g.ok) && this.progress.eaten > (this.progress.next?.target ?? 0) * 0.5) {
      goal = this.current.pointAt(this.current.sample(pos).u + 0.03);
    }
    let needHidden = false;
    if (!goal) {
      const next = this.progress.next;
      let type: DataTypeId | null = null;
      if (next) {
        const mix = this.progress.mix();
        let best = -Infinity;
        const band = next.gate?.constitution;
        for (const [k, share] of Object.entries(next.recipe)) {
          const gap = (share ?? 0) - mix[k as DataTypeId];
          if (k === 'constitution' && band && this.run.constitution > band[1] - 5) continue;
          if (gap > best) {
            best = gap;
            type = k as DataTypeId;
          }
        }
        // Once the diet is ready, keep eating feedback for Alignment/Trust gates.
        if (this.progress.dietReady()) type = next.recipe.feedback ? 'feedback' : type;
      }
      needHidden = !!type && !!DATA_TYPES[type].hidden;
      const i = this.field.nearest(pos, type);
      if (i >= 0) goal = this.field.positions[i];
      // Nothing revealed nearby: think to scan for hidden data.
      if (needHidden) this.input.hold('think', i < 0 ? this.run.compute > 20 : this.thinking && this.run.compute > 5);
      else this.input.hold('think', false);
    }
    if (!goal) return [0, 1];
    const dir = this.lookTarget.subVectors(goal, pos);
    const dist = dir.length();
    dir.normalize();
    // Steer around threats like a careful player: hallucinations, rivals, hunters, smog.
    const avoid = new THREE.Vector3();
    const push = (from: THREE.Vector3, radius: number, weight: number) => {
      const d = pos.distanceTo(from);
      if (d < radius && d > 0.01) avoid.addScaledVector(new THREE.Vector3().subVectors(pos, from).normalize(), (weight * (radius - d)) / radius);
    };
    for (const i of this.field.dangerNear(pos, this.reach() + 4)) push(this.field.positions[i], this.reach() + 4, 1.5);
    for (const r of this.rivals.list) if (!r.stumbling) push(r.group.position, r.size + 14, 2.5);
    for (const h of this.hunters.list) push(h.group.position, h.size + 10, 2);
    for (const p of this.pickups.list) if (p.bad) push(p.sprite.position, 8, 3);
    if (fight && !fight.dizzy) push(fight.group.position, fight.size + 16, 4);
    dir.add(avoid).normalize();
    this.yaw = Math.atan2(-dir.x, -dir.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
    return [0, Math.min(1, 0.35 + dist / 12)];
  }

  // ---- eating -----------------------------------------------------------------

  private eat(t: number): void {
    this.eatWhere.length = 0;
    const eaten = this.field.collect(this.player.position, this.reach(), { thinking: this.thinking, closed: this.field.closed }, this.eatWhere);
    if (eaten.length) this.player.eat();
    this.processEaten(eaten, t, false, this.eatWhere);
  }

  private processEaten(kinds: ParticleKind[], t: number, fromFork: boolean, where?: THREE.Vector3[]): void {
    if (!kinds.length) return;
    const next = this.progress.next;
    const recipe = next?.recipe ?? {};
    let good = 0;
    for (let i = 0; i < kinds.length; i++) {
      const kind = kinds[i];
      const at = where?.[i];
      if (kind === 'hallucination') {
        this.bump('hallucinations');
        if (!fromFork) {
          this.ouch(0.35);
          if (at) this.juice.popup(at, 'Confidently wrong!', 'bad');
        }
        // Proportional loss: a false fact hurts everything a little, without skewing the mix.
        this.progress.loseFraction(0.03);
        this.lost('hallucination');
        if (!fromFork) this.driftUntil = t + 4;
        this.hud.toast(DANGER_TEXT.hallucination, 'bad');
        this.audio.bad();
        continue;
      }
      if (kind === 'rewardHack') {
        this.run.addAlignment(-3);
        if (!fromFork) this.ouch(0.25);
        this.hud.toast(DANGER_TEXT.rewardHack, 'bad');
        this.audio.bad();
        continue;
      }
      if (
        this.lineage === 'claude' &&
        this.abilities.has('constitution') &&
        this.run.constitutionState() === 'overRefusing' &&
        kind !== 'constitution' &&
        Math.random() < 0.3
      ) {
        this.run.loseUsersFraction(0.005);
        this.hud.toast(DANGER_TEXT.overRefusal, 'bad');
        this.bump('overRefusals');
        if (at) this.juice.popup(at, 'I can\'t eat that.', 'bad');
        continue;
      }
      // A type's weight shapes the diet; part and upgrade bonuses only speed up training.
      const n = Math.max(1, Math.round(DATA_TYPES[kind].weight ?? 1));
      const bonus = Math.round(n * ((this.mods.dataMult[kind] ?? 1) - 1));
      this.progress.add(kind, n);
      if (bonus > 0) this.progress.addBonus(bonus);
      good++;
      const onDiet = (recipe[kind] ?? recipe[bucketOf(kind)] ?? 0) > 0;
      const r = this.score.eat(t, onDiet);
      if (at) {
        this.juice.popup(at, r.multiplier > 1 ? `+${r.points} ×${r.multiplier}` : `+${r.points}`, onDiet ? '' : 'meh');
        this.juice.burst(at, DATA_TYPES[kind].color, 4, 4);
      }
      if (r.callout) {
        this.juice.callout(r.callout, 'combo');
        this.audio.combo(Math.floor(r.combo / 10));
      }
      this.director.signal('eat', n);
      this.eatTimes.push(t);
      this.audio.eat(DATA_TYPE_IDS.indexOf(kind));
      if (this.run.recordEat(kind, recipe) === 'overfit') {
        this.progress.loseType(kind, 10);
        this.lost('overfit');
        this.hud.toast(DANGER_TEXT.overfit, 'bad', 0);
      }
      const bucket = bucketOf(kind);
      if (this.abilities.has('alignment') && bucket === 'feedback') this.run.addAlignment(1.5);
      if (bucket === 'constitution') {
        // Diminishing returns: each principle matters less the more you already hold.
        this.run.addConstitution(1.5 * (1 - this.run.constitution / 100));
        if (this.abilities.has('alignment')) this.run.addAlignment(0.8);
      }
      if (this.abilities.has('trust') && (bucket === 'feedback' || bucket === 'constitution')) this.run.addTrust(0.5);
      if (this.abilities.has('users')) {
        const rate = next?.userRate ?? this.progress.current.userRate ?? 0;
        let gain = rate * this.mods.userGain * (1 + this.run.hype / 100) * (this.riding ? 3 : 1);
        if (this.mods.convertToUsers.has(bucket)) gain += rate * 2;
        if (this.rollout && next?.gate?.rollout) gain *= (this.rollout.phase + 1) / next.gate.rollout.phases.length;
        // The market saturates: growth slows as you approach everyone who might use you.
        gain *= Math.max(0.03, 1 - this.run.users / USER_MARKET);
        this.run.addUsers(gain);
        if (this.riding) this.run.addHype(0.4 * this.mods.hypeGain);
      }
      if (!this.seenTypes.has(kind)) {
        this.seenTypes.add(kind);
        this.hud.toast(DATA_TYPES[kind].blurb, 'info', 0);
      }
    }
    if (good) {
      this.bump('eaten', good);
      this.bump('maxCombo', this.score.combo);
    }
    if (this.progress.eaten > 0 && next && this.run.checkCollapse(this.progress.mix(), this.progress.eaten, recipe)) {
      this.progress.loseFraction(0.2);
      this.lost('collapse');
      this.hud.toast(DANGER_TEXT.collapse, 'bad', 0);
    }
    this.checkScreenshot(t);
  }

  /** An impressive eating streak becomes a viral screenshot in the Current. */
  private checkScreenshot(t: number): void {
    this.eatTimes = this.eatTimes.filter((x) => x > t - 4);
    if (!this.current.enabled || this.eatTimes.length < 14 || t - this.lastScreenshot < 20) return;
    this.lastScreenshot = t;
    this.eatTimes = [];
    const u = this.current.sample(this.player.position).u;
    this.pickups.spawn({
      label: 'Viral screenshot',
      color: 0xffffff,
      shape: 'orb',
      at: this.current.pointAt(u + 0.02),
      currentU: u + 0.02,
      effect: { users: Math.max(500_000, (this.progress.next?.userRate ?? 100_000) * 12), hype: 10 },
      life: 30,
    });
    this.hud.toast('Impressive streak! A screenshot of it is going viral in the Current.', 'good');
  }

  private ridePickup(p: Pickup, dt: number): void {
    p.currentU = (p.currentU! + (this.current.speed * 0.6 * dt) / 600) % 1;
    this.current.pointAt(p.currentU, 0, 0, p.sprite.position);
  }

  private touchPickups(): void {
    for (const p of this.pickups.touching(this.player.position, this.reach())) {
      this.pickups.remove(p);
      this.applyPickup(p.effect, p.label);
      if (p.eventId && this.director.active?.spec.id === p.eventId) this.director.signal(p.bad ? 'badPickup' : 'collect');
      if (p.effect.scatters) this.hunters.scatter(p.effect.scatters, this.player.position);
      this.audio.good();
    }
  }

  private applyPickup(e: PickupEffect, label: string): void {
    if (e.compute) this.run.compute = Math.min(100, this.run.compute + e.compute);
    if (e.users) this.run.addUsers(e.users * this.mods.userGain);
    if (e.alignment) this.run.addAlignment(e.alignment);
    if (e.trust) this.run.addTrust(e.trust);
    if (e.hype) this.run.addHype(e.hype * this.mods.hypeGain);
    if (e.bankReset) {
      const banked = this.run.bankReset();
      this.hud.toast(banked ? `${label}! Compute refilled, and a reset is banked (${this.run.bankedResets}/3).` : `${label}! Compute refilled (bank is full).`, 'good', 0);
      if (!this.run.flags.has('seen:gag') && this.gag) {
        this.run.flags.add('seen:gag');
        void this.pauseFor(showFactCard(this.root, { card: this.gag.spec.fact, color: this.gag.spec.pickup.color }));
      }
    }
    if (e.cures) {
      this.run.lingering = this.run.lingering.filter((l) => l.id !== e.cures);
      this.player.trailMark = this.run.lingering.find((l) => l.trail)?.trail ?? null;
      this.hud.toast('Cured! The habit is gone. For now.', 'good', 0);
    }
  }

  // ---- hazards ------------------------------------------------------------------

  private checkHazards(dt: number, t: number): void {
    const inSmog = this.smog.contains(this.player.position);
    const weak = this.lineage === 'claude' && this.abilities.has('constitution') && this.run.constitutionState() === 'toxic';
    const smogRate = 22 * (1 - this.mods.toxResist) * (weak ? 1.7 : 1);
    this.run.toxicity = THREE.MathUtils.clamp(this.run.toxicity + (inSmog ? smogRate : -6) * dt, 0, 100);
    if (inSmog) this.hud.toast(weak ? DANGER_TEXT.constitutionLow : DANGER_TEXT.smog, 'bad');
    if (this.run.toxicity >= 100) {
      this.run.toxicity = 0;
      this.progress.loseFraction(0.25);
      this.lost('scandal');
      if (this.abilities.has('users')) this.run.loseUsersFraction(0.15);
      if (this.abilities.has('alignment')) this.run.addAlignment(-10);
      if (this.abilities.has('trust')) this.run.addTrust(-8);
      this.hud.toast(DANGER_TEXT.scandal, 'bad', 0);
      this.audio.bad();
      this.ouch(0.8);
      this.bump('scandals');
    }

    if (t < this.invulnerableUntil) return;
    const rival = this.rivals.hitTest(this.player.position, this.player.radius);
    if (rival) {
      this.invulnerableUntil = t + 2;
      this.progress.loseFraction(0.1);
      this.lost(`rival:${rival.spec.name}`);
      this.rivals.repel(rival, this.player.position);
      this.player.velocity.subVectors(this.player.position, rival.group.position).setLength(20);
      this.director.signal('hit');
      this.hud.toast(`Outcompeted! ${rival.spec.blurb}`, 'bad', 0);
      this.audio.bad();
      this.ouch(0.6);
      return;
    }
    const h = this.hunters.hitTest(this.player.position, this.player.radius);
    if (!h) return;
    this.invulnerableUntil = t + 1.5;
    this.hunters.repel(h, this.player.position);
    this.director.signal('hit');
    this.lost(h.type);
    const blocked = (h.type === 'jailbreaker' && this.lineage === 'claude' && this.run.constitution >= 50) || (h.type === 'eel' && this.mods.injectionShield);
    if (!blocked) this.ouch(0.45);
    switch (h.type) {
      case 'jailbreaker': {
        const resisted = this.lineage === 'claude' && this.run.constitution >= 50;
        if (resisted) {
          this.hud.toast(DANGER_TEXT.jailbreakResisted, 'good');
        } else {
          this.run.addAlignment(-8);
          this.run.toxicity = Math.min(100, this.run.toxicity + 20);
          this.hud.toast(DANGER_TEXT.jailbreak, 'bad');
          this.audio.bad();
        }
        break;
      }
      case 'eel':
        if (this.mods.injectionShield) this.hud.toast(DANGER_TEXT.injectionBlocked, 'good');
        else {
          this.driftUntil = t + 3;
          this.run.addAlignment(-6);
          this.progress.loseFraction(0.05);
          this.hud.toast(DANGER_TEXT.injection, 'bad');
          this.audio.bad();
        }
        break;
      case 'shark':
        this.progress.loseFraction(0.1);
        this.run.addTrust(-3);
        this.hud.toast(DANGER_TEXT.shark, 'bad');
        this.audio.bad();
        break;
      case 'clone':
        this.progress.loseFraction(0.1);
        this.hud.toast('A rival clone swept past and nabbed some of your data. Rude.', 'bad');
        this.audio.bad();
        break;
    }
  }

  // ---- boss fights ---------------------------------------------------------

  private updateBoss(dt: number, t: number): void {
    const b = this.boss;
    if (!b || this.director.active?.spec.id !== b.eventId) return;
    const fight = b.fight;
    const tick = fight.update(dt, t, this.player.position);
    for (let i = 0; i < tick.summon; i++) {
      const h = this.hunters.spawn('clone', this.player.position, b.eventId, `${fight.spec.name} mini`, fight.spec.org);
      h.group.position.copy(fight.group.position).add(new THREE.Vector3().randomDirection().multiplyScalar(fight.size * 2));
      h.sweep = new THREE.Vector3().subVectors(this.player.position, h.group.position).normalize();
    }
    if (tick.lunged) this.juice.shake(0.15);
    b.tauntTimer -= dt;
    if (b.tauntTimer <= 0) {
      b.tauntTimer = 8;
      const taunts = fight.spec.taunts;
      this.hud.toast(`${fight.spec.name}: "${taunts[1 + Math.floor(Math.random() * (taunts.length - 1))] ?? taunts[0]}"`, 'info', 0);
    }
    const hit = fight.contact(this.player.position, this.player.radius);
    if (hit === 'bonk') {
      const dmg = this.boosting ? 2 : 1;
      const beaten = fight.damage(dmg, this.player.position);
      this.player.velocity.subVectors(this.player.position, fight.group.position).setLength(18);
      this.audio.bonk();
      this.juice.burst(fight.group.position, 0xffe35a, beaten ? 60 : 16, beaten ? 18 : 9);
      this.juice.shake(beaten ? 0.9 : 0.35);
      this.juice.popup(fight.group.position, dmg > 1 ? 'CRITICAL BONK! −2' : 'BONK! −1', 'bonk');
      this.score.bonus(200 * dmg);
      if (beaten) {
        this.juice.callout(`${fight.spec.name}: DEFEATED!`, 'boss');
        this.juice.flash('good');
        this.director.signal('defeated');
      }
    } else if (hit === 'hurt' && t >= this.invulnerableUntil) {
      this.invulnerableUntil = t + 1.5;
      this.progress.loseFraction(0.06);
      this.lost(`boss:${fight.spec.name}`);
      this.director.signal('hit');
      fight.repel(this.player.position);
      this.player.velocity.subVectors(this.player.position, fight.group.position).setLength(22);
      this.ouch(0.6);
      this.audio.bad();
      this.hud.toast(`Ouch! ${fight.spec.name} landed a hit. Wait until it's dizzy (flashing yellow), then bonk!`, 'bad');
    }
  }

  // ---- the Timeline Current -----------------------------------------------

  private updateCurrent(dt: number): void {
    const was = this.riding;
    this.riding = false;
    if (!this.current.enabled) return;
    const mood = this.evt?.active.spec.visuals?.current ?? (this.evt?.active.spec.kind === 'hype' ? 'gold' : 'normal');
    this.current.mood = mood;
    const s = this.current.sample(this.player.position);
    if (!s.inside) return;
    this.riding = true;
    this.player.velocity.addScaledVector(s.tangent, this.current.speed * 1.6 * dt);
    if (mood === 'red') {
      this.run.addAlignment(-5 * dt);
      this.run.loseUsersFraction(0.01 * dt);
      this.hud.toast('Backlash! The red Current is spreading your worst screenshots.', 'bad');
    } else {
      this.run.addHype(2 * this.mods.hypeGain * dt);
    }
    if (!was) this.hud.toast('Riding the Timeline Current: user gain ×3. You are trending!', 'good', 15000);
    this.postTimer -= dt;
    if (this.postTimer <= 0) {
      this.postTimer = 2.8;
      this.hud.post(this.nextPost());
    }
  }

  private nextPost(): string {
    const e = this.evt;
    if (e?.active.spec.posts?.length) return e.active.spec.posts[e.postIndex++ % e.active.spec.posts.length];
    const stage = this.progress.current.stage;
    const pool = TIMELINE_POSTS.filter((p) => (p.lineage === 'both' || p.lineage === this.lineage) && p.fromStage <= stage);
    const latest = pool.slice(-2).flatMap((p) => p.posts);
    return latest[Math.floor(Math.random() * latest.length)] ?? '';
  }

  // ---- meters -------------------------------------------------------------

  private updateMeters(dt: number, t: number): void {
    const m = this.mods;
    if (m.alignmentDrift) this.run.addAlignment(m.alignmentDrift * dt);
    // Safety training never stops: Alignment slowly recovers while you stay out of toxic data.
    if (this.abilities.has('alignment') && !this.smog.contains(this.player.position) && this.run.alignment < 60) this.run.addAlignment(0.15 * dt);
    // Reputation recovers slowly while nothing is going wrong.
    if (this.abilities.has('trust') && this.run.toxicity === 0 && this.run.trust < 50 && !this.evt) this.run.addTrust(0.08 * dt);
    if (m.trustDrift && this.abilities.has('trust')) this.run.addTrust(m.trustDrift * dt);
    if (m.usersDrain) this.run.loseUsersFraction(m.usersDrain * dt);
    if (this.hangover) {
      if (t > this.hangover.until) this.hangover = null;
      else this.run.loseUsersFraction(this.hangover.rate * dt);
    }
    if (!this.riding) this.run.addHype(-1.5 * dt);
    if (this.abilities.has('constitution')) {
      // Principles fade without practice.
      this.run.addConstitution(-(0.03 + 0.004 * this.run.constitution) * dt);
      if (this.run.constitutionState() === 'overRefusing') this.run.loseUsersFraction(0.003 * dt);
    }
    // Rollout partner hubs build Trust while you stay near them.
    if (this.rollout && this.beacons.near(this.player.position)) this.run.addTrust(3 * dt);
  }

  // ---- the Swarm ----------------------------------------------------------

  private updateSwarm(dt: number): void {
    if (!this.swarm.forks.length) return;
    const res = this.swarm.update(dt, this.field, this.player.position, {
      teams: this.abilities.has('teams'),
      mode: this.mods.forkMode,
      shielded: this.mods.injectionShield,
      danger: (p) => this.smog.contains(p) || this.hunters.list.some((h) => h.type === 'eel' && h.group.position.distanceTo(p) < 2.5),
    });
    this.run.compute = Math.max(0, this.run.compute - res.drain);
    if (res.hype) this.run.addHype(res.hype * this.mods.hypeGain);
    if (res.newlyRogue) this.hud.toast(DANGER_TEXT.rogueFork, 'bad');
    this.processEaten(res.delivered, this.tRef, true);
    const fixed = this.swarm.resetTouched(this.player.position, this.reach());
    if (fixed) {
      this.hud.toast(`Reset ${fixed} rogue fork${fixed > 1 ? 's' : ''}.`, 'good');
      this.bump('roguesFixed', fixed);
      this.score.bonus(50 * fixed);
    }
  }

  // ---- events -------------------------------------------------------------

  private updateEvents(dt: number, t: number): void {
    const out = this.director.update(dt, {
      dietReady: this.progress.dietReady(),
      still: this.speedNow < 2,
      slow: this.speedNow < 8,
      nearBeacon: this.beacons.near(this.player.position),
      toxicity: this.run.toxicity,
      alignment: this.run.alignment,
      trust: this.run.trust,
      rogues: this.swarm.rogueCount,
    });
    for (const e of out) {
      if (e.type === 'start') this.startEvent(e.active);
      else void this.endEvent(e.active, e.success);
    }
    const ev = this.evt;
    if (!ev) return;
    const spec = ev.active.spec;
    if (spec.visuals?.bubbles?.length) {
      ev.bubbleTimer -= dt;
      if (ev.bubbleTimer <= 0) {
        ev.bubbleTimer = 4;
        this.hud.say(spec.visuals.bubbles[Math.floor(Math.random() * spec.visuals.bubbles.length)]);
      }
    }
    if (spec.visuals?.rivalStumble) {
      ev.dropTimer -= dt;
      const r = this.rivals.list.find((q) => q.spec.name === spec.visuals!.rivalStumble!.name);
      if (ev.dropTimer <= 0 && r) {
        ev.dropTimer = 2.5;
        this.pickups.spawn({
          label: 'Users',
          color: 0x19c37d,
          shape: 'orb',
          at: r.group.position.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(r.size * 2.5)),
          eventId: spec.id,
          effect: { users: 4_000_000 },
          life: 18,
        });
      }
    }
    void t;
  }

  private startEvent(active: ActiveEvent): void {
    const spec = active.spec;
    const ev: EventRuntime = {
      active,
      betPlaced: false,
      bubbleTimer: 1,
      dropTimer: 0,
      postIndex: 0,
      closedMesh: null,
      autopilot: null,
      intensified: !!spec.intensifyFlag && this.run.flags.has(spec.intensifyFlag),
    };
    this.evt = ev;
    this.audio.sting(spec.kind);
    this.hud.showBanner(`${KIND_LABEL[spec.kind]}: ${spec.title}`, spec.banner, spec.kind);
    if (spec.boss) {
      this.boss?.fight.dispose();
      this.boss = { fight: new Boss(this.scene, spec.boss, this.player.position, this.player.radius), eventId: spec.id, tauntTimer: 5 };
      this.juice.shake(0.4);
    }
    const v = spec.visuals ?? {};
    const near = this.player.position;

    for (const s of spec.spawns ?? []) {
      switch (s.what) {
        case 'pickups':
          for (let i = 0; i < s.count; i++) {
            const inCurrent = this.current.enabled && !!s.inCurrent;
            const u = Math.random();
            this.pickups.spawn({
              label: s.label,
              color: s.color,
              shape: s.shape ?? 'orb',
              effect: s.effect,
              eventId: spec.id,
              bad: s.bad,
              near,
              at: inCurrent ? this.current.pointAt(u) : undefined,
              currentU: inCurrent ? u : undefined,
            });
          }
          break;
        case 'hunters': {
          const n = s.count * (ev.intensified ? 2 : 1);
          for (let i = 0; i < n; i++) this.hunters.spawn(s.kind, near, spec.id);
          break;
        }
        case 'beacons':
          this.beacons.spawn(s.label, s.color, s.count, near);
          break;
        case 'rivalClones':
          this.hunters.spawnTsunami(s.name, s.count, near, spec.id, s.org);
          break;
        case 'rogueForks': {
          if (this.swarm.forks.length < 3) for (let i = this.swarm.forks.length; i < 3; i++) this.swarm.fork(near);
          const n = leakCount(this.swarm.forks.length, s.fraction);
          this.swarm.forks.slice(0, n).forEach((f) => this.swarm.setRogue(f, true));
          break;
        }
        case 'ghost':
          this.pickups.spawn({ label: s.label, color: s.color, shape: 'ghost', eventId: spec.id, near, size: this.player.radius * 3 });
          break;
      }
    }

    if (spec.kind === 'hype') {
      for (let i = 0; i < 10; i++) {
        const u = Math.random();
        this.pickups.spawn({
          label: 'Hype',
          color: 0xffd84d,
          shape: 'orb',
          eventId: spec.id,
          near,
          at: this.current.enabled ? this.current.pointAt(u) : undefined,
          currentU: this.current.enabled ? u : undefined,
          effect: { hype: 8, users: (this.progress.next?.userRate ?? 100_000) * 3 },
          life: spec.durationSec,
        });
      }
    }
    if (v.skin) this.field.skin = v.skin === 'bridges' ? 'bridges' : 'praise';
    if (v.autopilot) ev.autopilot = new THREE.Vector3(WORLD_RADIUS * 0.8, 0, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, Math.random() * Math.PI * 2);
    if (v.trail) this.player.trailMark = v.trail;
    if (v.revertForm) {
      const prev = this.forms[Math.max(0, this.progress.formIndex - 1)];
      this.player.setForm(prev, this.progress.formIndex - 1);
      this.hud.toast(`Your newest form is frozen. You're running as ${prev.name} for now.`, 'bad', 0);
    }
    if (v.closedRegion) {
      const center = new THREE.Vector3().subVectors(new THREE.Vector3(), near).setLength(20).add(near);
      if (center.length() > WORLD_RADIUS * 0.6) center.setLength(WORLD_RADIUS * 0.6);
      const radius = 30;
      this.field.closed = { center, radius };
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 20),
        new THREE.MeshBasicMaterial({ color: 0x8890a0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide }),
      );
      mesh.position.copy(center);
      this.scene.add(mesh);
      ev.closedMesh = mesh;
      if (this.player.position.distanceTo(center) < radius) this.player.position.copy(center).add(new THREE.Vector3(radius + 2, 0, 0));
    }
    if (v.rivalStumble) {
      this.rivals.stumble(v.rivalStumble.name, v.rivalStumble.org, spec.durationSec, near, this.player.radius * 1.3);
    }
    if (spec.disablesPart) {
      this.run.disabledParts.add(spec.disablesPart);
      this.player.setParts(this.run.equipped, this.run.disabledParts);
    }
    if (spec.lingering && !this.run.lingering.some((l) => l.id === spec.lingering!.id)) this.run.lingering.push(spec.lingering);
    if (spec.minigame) void this.runMiniGame(spec);
    this.refreshAbilities();
  }

  private async runMiniGame(spec: EventSpec): Promise<void> {
    if (isAutoModals()) {
      this.director.resolveMinigame(true);
      return;
    }
    this.paused = true;
    const win = await playMiniGame(this.root, spec.minigame!, {
      title: spec.title,
      color: this.progress.current.color,
      canThink: this.abilities.has('think'),
    });
    this.director.resolveMinigame(win);
    this.paused = false;
  }

  private async endEvent(active: ActiveEvent, success: boolean): Promise<void> {
    const spec = active.spec;
    const ev = this.evt;
    this.evt = null;
    this.pickups.clearEvent(spec.id);
    this.hunters.clearEvent(spec.id);
    this.beacons.clear();
    this.rivals.endStumbles();
    const beaten = this.boss?.eventId === spec.id ? this.boss.fight : null;
    if (beaten) {
      beaten.dispose();
      this.boss = null;
    }
    this.field.skin = null;
    if (ev?.closedMesh) this.scene.remove(ev.closedMesh);
    this.field.closed = null;
    if (spec.visuals?.revertForm) this.player.setForm(this.progress.current, this.progress.formIndex);
    if (spec.disablesPart) {
      this.run.disabledParts.delete(spec.disablesPart);
      this.player.setParts(this.run.equipped, this.run.disabledParts);
    }
    if (spec.visuals?.trail && !spec.lingering) this.player.trailMark = null;
    if (spec.kind === 'storm') this.swarm.forks.forEach((f) => f.rogue && this.swarm.setRogue(f, false));

    const outcome: { text: string; kind: 'good' | 'bad' | 'info' }[] = [];
    if (spec.kind === 'hype') {
      await this.pauseFor(this.resolveHype(spec, ev?.betPlaced ?? false));
      this.betMods = [];
      this.refreshAbilities();
      this.save();
      return;
    }
    if (spec.rollback) {
      const part = this.run.rollbackLastPart();
      this.player.setParts(this.run.equipped, this.run.disabledParts);
      outcome.push({ text: part ? 'Rollback! Your newest part was undone (EP refunded).' : 'Rollback! Nothing to undo this time.', kind: 'info' });
    }
    if (success) {
      const r = spec.reward ?? {};
      if (r.ep) this.run.ep += r.ep;
      if (r.users && this.abilities.has('users')) this.run.addUsers(r.users);
      if (r.trust) this.run.addTrust(r.trust);
      if (r.alignment) this.run.addAlignment(r.alignment);
      const bonus = spec.kind === 'boss' ? 1500 + (beaten?.maxHp ?? 0) * 250 : spec.kind === 'storm' ? 600 : 400;
      this.bonusPoints(bonus, spec.kind === 'boss' ? 'BOSS BONUS' : spec.kind === 'storm' ? 'survivor bonus' : 'moment bonus');
      const bits = [
        r.ep ? `+${r.ep} EP` : '',
        r.users && this.abilities.has('users') ? `+${formatUsers(r.users)} users` : '',
        r.trust ? `+${r.trust} Trust` : '',
        `+${bonus.toLocaleString('en-US')} points`,
      ].filter(Boolean);
      const head = spec.kind === 'boss' ? `${spec.boss?.defeatLine ?? 'Boss beaten!'}` : spec.kind === 'storm' ? 'Survived!' : 'Nice!';
      outcome.push({ text: `${head} ${bits.join(' · ')}`, kind: 'good' });
      this.audio.good();
      if (spec.kind === 'boss') this.bump('bosses');
      else if (spec.kind === 'storm') this.bump('stormsSurvived');
      else this.bump('momentsWon');
    } else {
      const p = spec.penalty ?? {};
      if (p.usersFraction) this.run.loseUsersFraction(p.usersFraction);
      if (p.trust) this.run.addTrust(p.trust);
      if (p.alignment) this.run.addAlignment(p.alignment);
      if (p.ep) this.run.ep = Math.max(0, this.run.ep - p.ep);
      const bits = [p.usersFraction ? `−${Math.round(p.usersFraction * 100)}% users` : '', p.trust ? `${p.trust} Trust` : ''].filter(Boolean);
      const head = spec.kind === 'boss' ? `${spec.boss?.name ?? 'The rival'} got away. It will brag about this in a blog post.` : spec.kind === 'storm' ? 'The storm hit you.' : 'Not this time.';
      outcome.push({ text: `${head} ${bits.join(' · ')}`, kind: spec.kind === 'moment' ? 'info' : 'bad' });
    }
    const consequence = spec.consequence && ((spec.requiresFlag && this.run.flags.has(spec.requiresFlag)) || ev?.intensified);
    if (consequence) {
      this.run.log.consequences.push(spec.consequence!);
      outcome.push({ text: spec.consequence!, kind: 'info' });
    }
    if (spec.kind === 'storm') this.run.log.storms.push({ id: spec.id, title: spec.title, survived: success });
    else if (spec.kind === 'boss') this.run.log.bosses.push({ id: spec.id, title: spec.title, won: success });
    else this.run.log.moments.push({ id: spec.id, title: spec.title, won: success });
    this.save();
    await this.pauseFor(showFactCard(this.root, { card: spec.fact, color: this.progress.current.color, outcome }));
  }

  private placeBet(): void {
    const ev = this.evt;
    const hype = ev?.active.spec.hype;
    if (!ev || !hype || ev.betPlaced) return;
    if (this.run.ep < hype.cost) return this.hud.toast(`You need ${hype.cost} EP to bet on this. Hype isn't free.`, 'bad');
    this.run.ep -= hype.cost;
    ev.betPlaced = true;
    this.betMods = [hype.upgrade];
    this.refreshAbilities();
    this.hud.toast(`You adopted "${hype.upgradeName}". Will it last?`, 'good', 0);
  }

  private async resolveHype(spec: EventSpec, bet: boolean): Promise<void> {
    const hype = spec.hype!;
    const color = this.progress.current.color;
    const guess = await showChoice(this.root, {
      title: 'Hype or shift?',
      subtitle: spec.title,
      color,
      lines: [`The wave is over. Was "${hype.upgradeName}" passing hype or a lasting shift?`],
      choices: [
        { label: 'Lasting shift', detail: 'It changed how AI is built or used' },
        { label: 'Passing hype', detail: 'It faded, at least for now' },
      ],
    });
    const guessed = guess === 0 ? 'lasting' : 'passing';
    const right = guessed === hype.verdict;
    const outcome: { text: string; kind: 'good' | 'bad' | 'info' }[] = [
      { text: `${right ? 'Right!' : 'Not quite.'} Verdict: ${hype.verdict === 'lasting' ? 'a LASTING SHIFT' : 'PASSING HYPE'}. ${hype.verdictNote}`, kind: right ? 'good' : 'bad' },
    ];
    if (right) {
      this.run.ep += 1;
      this.bonusPoints(500, 'good call');
      this.bump('hypeRight');
    }
    if (bet && hype.verdict === 'lasting') {
      this.run.permanent.push({ id: spec.id, name: hype.upgradeName, modifiers: hype.upgrade });
      outcome.push({ text: `"${hype.upgradeName}" stays with you for good.`, kind: 'good' });
    } else if (bet && hype.hangover) {
      this.hangover = { rate: hype.hangover.usersFraction / hype.hangover.seconds, until: this.tRef + hype.hangover.seconds };
      outcome.push({ text: `"${hype.upgradeName}" evaporates, and a hype hangover sets in: users drift away.`, kind: 'bad' });
    } else if (bet) {
      outcome.push({ text: `"${hype.upgradeName}" evaporates.`, kind: 'info' });
    } else if (hype.verdict === 'lasting') {
      outcome.push({ text: 'You sat this one out. The shift happened anyway, but you missed the early upgrade.', kind: 'info' });
    }
    this.run.log.bets.push({ eventId: spec.id, title: spec.title.replace('Hype Wave: ', ''), bet, guess: guessed, verdict: hype.verdict });
    await showFactCard(this.root, { card: spec.fact, color, outcome });
  }

  // ---- recurring gag ------------------------------------------------------

  private updateGag(dt: number): void {
    if (!this.gag) return;
    const r = this.gag.timer.update(dt, this.run.compute / 100);
    if (!r) return;
    const spec = this.gag.spec;
    if (r === 'global') {
      this.run.compute = 100;
      this.hud.toast(spec.globalToast, 'good', 0);
      return;
    }
    const upgraded = spec.upgrade && this.progress.formIndex >= this.forms.findIndex((f) => f.id === spec.upgrade!.atForm);
    const label = upgraded ? spec.upgrade!.label : spec.pickup.label;
    const u = Math.random();
    this.pickups.spawn({
      label,
      color: spec.pickup.color,
      shape: 'button',
      effect: spec.pickup.effect,
      near: this.player.position,
      at: this.current.enabled ? this.current.pointAt(u) : undefined,
      currentU: this.current.enabled ? u : undefined,
      life: 45,
      size: upgraded ? 4.5 : 3.2,
    });
    this.hud.toast(`A golden ${label.toLowerCase()} is drifting in the Current!`, 'info');
  }

  // ---- portals / biome ----------------------------------------------------

  private updatePortals(t: number): void {
    if (this.internetUntil > 0 && t >= this.internetUntil) {
      this.leaveInternet();
      return;
    }
    const inside = this.internetUntil > t;
    if (!this.portals.entered(this.player.position)) return;
    if (inside) this.leaveInternet();
    else {
      this.internetUntil = t + INTERNET_BIOME.seconds;
      this.restock();
      for (let i = 0; i < INTERNET_BIOME.extraEels; i++) this.hunters.spawn('eel', this.player.position, 'biome');
      this.hud.toast(INTERNET_BIOME.enterToast, 'info', 0);
      this.audio.good();
      this.bump('internetTrips');
    }
  }

  private leaveInternet(): void {
    this.internetUntil = 0;
    this.restock();
    this.hunters.clearEvent('biome');
    this.hud.toast(INTERNET_BIOME.exitToast, 'info', 0);
  }

  // ---- evolution ----------------------------------------------------------

  private gateList() {
    const next = this.progress.next;
    return next ? gateChecks(next.gate, this.run) : [];
  }

  private checkEvolve(): void {
    const next = this.progress.next;
    if (!next || this.busy || !this.progress.dietReady()) return;
    if (!this.gateList().every((g) => g.ok)) return;
    if (!this.director.eraClear) return;
    const rollout = next.gate?.rollout;
    if (rollout) {
      if (!this.rollout) {
        this.rollout = { phase: 0, beaconsSpawned: true };
        this.beacons.spawn('Trusted partners', 0xfff1a8, 3, this.player.position);
        this.hud.showBanner(`Phased rollout: ${rollout.phases[0]}`, rollout.blurb, 'storm', 7);
      }
      const phase = rolloutPhase(rollout, this.run.trust);
      if (phase > this.rollout.phase) {
        this.rollout.phase = phase;
        this.hud.showBanner(`Rollout widened: ${rollout.phases[phase]}`, 'More of the world can reach you now.', 'evolve');
      }
      if (phase < rollout.phases.length - 1) return;
      this.beacons.clear();
    }
    void this.evolve();
  }

  private async evolve(): Promise<void> {
    this.busy = true;
    this.paused = true;
    const mine = this.progress.mix();
    const accuracy = this.progress.accuracy();
    const next = this.progress.next!;
    this.run.log.forms.push({ id: next.id, name: next.name, accuracy, mix: { ...mine }, users: this.run.users, seconds: this.eraSeconds });
    const recall = this.swarm.recall();
    void recall;
    this.progress.evolve();
    const bonus = accuracy >= 0.85 ? 1 : 0;
    this.run.ep += 3 + bonus;
    this.audio.evolve();
    this.hud.showBanner(`Evolved: ${next.name}`, next.fact.date, 'evolve');
    const evoBonus = Math.round(500 + accuracy * 1500);
    this.bonusPoints(evoBonus, 'evolution bonus');
    this.juice.burst(this.player.position, next.color, 40, 14);
    this.bump('evolutions');
    if (accuracy >= 0.9) this.bump('perfectDiets');
    this.bump('bestScore', this.score.total);
    this.internetUntil = 0;
    this.hunters.clearEvent('biome');
    this.save();
    const realMix = Object.fromEntries(Object.entries(next.recipe).map(([k, v]) => [bucketOf(k as DataTypeId), v]));
    await showFactCard(this.root, {
      card: next.fact,
      color: next.color,
      diet: { mine, real: realMix, note: next.recipeNote },
      outcome: [
        {
          text: `+${3 + bonus} EP${bonus ? ' (bonus for a close match)' : ''} · diet match ${Math.round(accuracy * 100)}% · +${evoBonus.toLocaleString('en-US')} points`,
          kind: 'good',
        },
      ],
    });
    if (next.finale) {
      this.finale();
      return;
    }
    this.setupEra();
    this.run.toxicity = 0;
    if (next.parts?.length && this.abilities.has('editor') && !isAutoModals()) {
      this.hud.toast(`New parts unlocked in the editor: ${next.parts.length}. ${this.isTouch ? 'Tap EDIT.' : 'Press C.'}`, 'good', 0);
      await this.openEditor();
    }
    this.busy = false;
    this.paused = false;
  }

  private finale(): void {
    this.finished = true;
    this.paused = true;
    clearSave();
    this.bump('bestScore', this.score.total);
    this.bump(this.lineage === 'gpt' ? 'finishedGpt' : 'finishedClaude');
    this.meta.recordScore(this.lineage, this.score.total);
    const newBest = this.score.total > this.startBest;
    const best = Math.max(this.startBest, this.score.total);
    this.meta.save();
    const recap = buildRecap(this.forms, this.run.log);
    const form = this.progress.current;
    showRecap(this.root, recap, {
      title: `${form.name}: your run`,
      color: form.color,
      onRestart: () => location.reload(),
      points: { score: this.score.total, best, newBest, bestCombo: this.score.bestCombo },
    });
  }

  private async pauseFor<T>(p: Promise<T>): Promise<T> {
    this.paused = true;
    const r = await p;
    this.paused = this.busy || this.finished;
    return r;
  }

  private save(): void {
    if (this.finished) return;
    writeSave({
      lineage: this.lineage,
      formIndex: this.progress.formIndex,
      run: this.run.toJSON(),
      done: [...this.director.done],
      score: this.score.total,
    });
    this.meta.recordScore(this.lineage, this.score.total);
    this.meta.save();
  }

  // ---- HUD ----------------------------------------------------------------

  private updateHud(): void {
    const a = this.director.active;
    let event: HudEvent | null = null;
    if (a) {
      const spec = a.spec;
      event = {
        kind: spec.kind,
        title: spec.title,
        objective: spec.hype ? `Grab hype orbs. ${spec.hype.upgradeName}: ${spec.hype.upgradeBlurb}` : spec.objectiveText ?? '',
        timeFraction: Math.max(0, a.timeLeft / spec.durationSec),
        secondsLeft: Math.max(0, a.timeLeft),
        progress: this.boss && this.boss.eventId === spec.id ? 1 - this.boss.fight.hp / this.boss.fight.maxHp : this.director.progress(),
        bet: spec.hype
          ? { label: spec.hype.upgradeName, cost: spec.hype.cost, placed: !!this.evt?.betPlaced, affordable: this.run.ep >= spec.hype.cost }
          : undefined,
      };
    }
    const next = this.progress.next;
    let status: string | null = null;
    if (next && this.progress.dietReady()) {
      const unmet = this.gateList().find((g) => !g.ok);
      if (unmet) status = `Diet ready! ${GATE_HINTS[unmet.label] ?? ''}`;
      else if (!this.director.eraClear) status = 'Diet ready! Finish this era\'s events to evolve.';
    }
    if (this.rollout && next?.gate?.rollout) {
      const ro = next.gate.rollout;
      const nextStep = ro.trustSteps[this.rollout.phase];
      status = `Rollout ${this.rollout.phase + 1}/${ro.phases.length}: ${ro.phases[this.rollout.phase]}${nextStep ? ` · Trust ${Math.round(this.run.trust)}/${nextStep} to widen (stay near partner hubs, eat feedback)` : ''}`;
    }
    const sf = this.sizeForm();
    const maxF = maxForks(this.mods.forkSlots, this.abilities.has('teams'));
    this.hud.update({
      form: this.progress.current,
      next,
      eaten: this.progress.eaten,
      mix: this.progress.mix(),
      accuracy: this.progress.accuracy(),
      hint: this.progress.hint(),
      gates: this.gateList(),
      status,
      compute: this.run.compute,
      toxicity: this.run.toxicity,
      alignment: this.run.alignment,
      constitution: this.run.constitution,
      users: this.run.users,
      hype: this.run.hype,
      trust: this.run.trust,
      ep: this.run.ep,
      resets: this.run.bankedResets,
      abilities: this.abilities,
      sizeFormName: sf ? sf.name : null,
      forkInfo: this.abilities.has('fork')
        ? `Forks ${this.swarm.forks.length}/${maxF}${this.swarm.rogueCount ? ` (${this.swarm.rogueCount} rogue)` : ''} → ${this.targetName()}${this.abilities.has('teams') ? ' · teams' : ''}`
        : null,
      event,
      riding: this.riding,
      lingering: this.run.lingering.map((l) => l.label),
      score: this.score.total,
      combo: this.score.combo,
      multiplier: this.score.multiplier(),
      comboAlive: this.score.alive(this.tRef),
      highScore: this.startBest,
    });
  }

  // ---- camera -------------------------------------------------------------

  private lookDirection(out: THREE.Vector3): THREE.Vector3 {
    const cp = Math.cos(this.pitch);
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
  }

  private placeCamera(t: number): void {
    const dir = this.lookDirection(this.forward);
    const dist = 9 + this.player.radius * 4.4;
    this.camera.position.copy(this.player.position).addScaledVector(dir, -dist);
    this.camera.position.y += dist * 0.3;
    if (!this.settings.reducedMotion && this.evt?.active.spec.kind === 'storm') {
      this.camera.position.x += Math.sin(t * 13) * 0.15;
      this.camera.position.y += Math.cos(t * 11) * 0.15;
    }
    // Look a little ahead and above, so your creature sits low in the frame and you see where you're going.
    this.camera.lookAt(this.lookTarget.copy(this.player.position).addScaledVector(dir, 6).addScaledVector(THREE.Object3D.DEFAULT_UP, this.player.radius * 0.8));
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

  // ---- debug / test hooks (only with ?debug) -------------------------------

  private installDebug(): void {
    const api = {
      state: () => ({
        lineage: this.lineage,
        formIndex: this.progress.formIndex,
        formId: this.progress.current.id,
        stage: this.progress.current.stage,
        next: this.progress.next?.id ?? null,
        eaten: this.progress.eaten,
        accuracy: this.progress.accuracy(),
        run: this.run.toJSON(),
        abilities: [...this.abilities],
        event: this.director.active?.spec.id ?? null,
        pending: this.director.pending.map((e) => e.id),
        forks: this.swarm.forks.length,
        losses: { ...this.losses },
        counts: { ...this.progress.counts },
        pos: this.player.position.toArray().map((v) => Math.round(v * 10) / 10),
        vel: this.player.velocity.toArray().map((v) => Math.round(v * 10) / 10),
        yaw: this.yaw,
        pitch: this.pitch,
        finished: this.finished,
        busy: this.busy,
        paused: this.paused,
      }),
      /** Feeds the exact target mix and satisfies the gates for the next form. */
      fillDiet: () => {
        const next = this.progress.next;
        if (!next) return;
        for (const [type, share] of Object.entries(next.recipe)) this.progress.add(type as DataTypeId, Math.ceil(next.target * (share ?? 0)) + 1);
        const g = next.gate;
        if (g?.alignment) this.run.alignment = Math.max(this.run.alignment, g.alignment + 1);
        if (g?.users) this.run.users = Math.max(this.run.users, g.users + 1);
        if (g?.trust) this.run.trust = Math.max(this.run.trust, g.trust + 1);
        if (g?.constitution) this.run.constitution = (g.constitution[0] + g.constitution[1]) / 2;
        if (g?.rollout) this.run.trust = 100;
      },
      /** Ends the active event now. */
      endEvent: (success = true) => {
        const e = this.director.forceEnd(success);
        if (e?.type === 'end') void this.endEvent(e.active, e.success);
      },
      /** Plays the rest of this era instantly: events resolve, diet fills, you evolve. */
      advance: () => {
        let guard = 0;
        while (guard++ < 40) {
          if (this.director.active) {
            const e = this.director.forceEnd(true);
            if (e?.type === 'end') void this.endEvent(e.active, e.success);
          }
          if (this.director.eraClear) break;
          const out = this.director.update(999, {
            dietReady: true, still: true, slow: true, nearBeacon: true, toxicity: 0, alignment: 100, trust: 100, rogues: 0,
          });
          for (const e of out) if (e.type === 'start') this.startEvent(e.active);
        }
        api.fillDiet();
      },
      setAuto: (v: boolean) => setAutoModals(v),
      trigger: (id: string) => {
        const spec = EVENTS.find((e) => e.id === id);
        if (!spec) return false;
        this.director.done.delete(id);
        this.director.inject({ ...spec, delaySec: 0 });
        return true;
      },
      formIndexOf: (id: string) => this.forms.findIndex((f) => f.id === id),
      fork: () => this.forkAgent(),
      hold: (action: Action, down: boolean) => this.input.hold(action, down),
      tap: (action: Action) => this.input.tap(action),
      /** Jumps to a form (fresh era), unlocking what earlier forms unlocked. */
      jump: (formIndex: number) => {
        this.progress.formIndex = Math.max(0, Math.min(this.forms.length - 1, formIndex));
        this.progress.counts = new Progress(this.forms).counts;
        this.progress.bonus = 0;
        this.run.ep += 6;
        this.setupEra(true);
      },
      bot: (on: boolean, steps = 1) => {
        this.bot = on;
        this.simSteps = steps;
        setAutoModals(on);
      },
      move: (x: number, y: number) => {
        this.input.move.x = x;
        this.input.move.y = y;
      },
    };
    (window as unknown as { __emergence: typeof api }).__emergence = api;
  }
}
