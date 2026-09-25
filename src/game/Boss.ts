import * as THREE from 'three';
import { labFor } from '../config/labs';
import type { BossPattern, BossSpec } from '../config/types';
import { drawRing, drawShot, drawStar } from '../ui/creatures';
import { critterLooks, faceTravel } from './critter';
import { hexCss, makeLabel } from './labels';
import { Doodle, frames } from './sprites';

export type BossState = 'intro' | 'attack' | 'dizzy' | 'recoil';

const INTRO_SEC = 2.5;
const ATTACK_SEC = 5.5;
const DIZZY_SEC = 3.6;
const RECOIL_SEC = 0.9;

interface Shot {
  doodle: Doodle;
  vel: THREE.Vector3;
  life: number;
}

interface Ring {
  doodle: Doodle;
  r: number;
  speed: number;
  max: number;
}

export interface BossTick {
  /** Rival clones to summon this frame. */
  summon: number;
  /** A charge, lunge, or slam just started (for a whoosh). */
  lunged: boolean;
}

/**
 * A rival-lab boss: attacks in a pattern, then gets dizzy. Bonk it while it's
 * dizzy; stay out of its way while it attacks. The Game applies the damage.
 */
export class Boss {
  readonly group = new THREE.Group();
  readonly doodle: Doodle;
  readonly size: number;
  hp: number;
  state: BossState = 'intro';
  /** Set by the Game so the sprite faces its screen-space travel. */
  cameraRight = new THREE.Vector3(1, 0, 0);
  private readonly normalLooks: THREE.Texture[];
  private readonly dizzyLooks: THREE.Texture[];
  private stateT = 0;
  private cycleT = 0;
  private attacks = 0;
  private readonly velocity = new THREE.Vector3();
  private readonly dashDir = new THREE.Vector3();
  private readonly shots: Shot[] = [];
  private readonly rings: Ring[] = [];
  private readonly stars: Doodle[] = [];
  private readonly tmp = new THREE.Vector3();
  private readonly color: string;
  private orbitAngle = Math.random() * Math.PI * 2;
  private shotTimer = 0;
  private lunging = false;
  /** Speeds scale with the player's (bigger forms swim faster). */
  private readonly pace: number;
  /** How far away it likes to hover: clear of the player, whatever the sizes. */
  private readonly standoff: number;
  private readonly playerRadius: number;

  constructor(
    private readonly scene: THREE.Scene,
    readonly spec: BossSpec,
    near: THREE.Vector3,
    playerRadius: number,
  ) {
    this.size = spec.size * (0.6 + playerRadius * 0.5);
    this.playerRadius = playerRadius;
    this.pace = (10 + playerRadius * 2) / 12;
    this.standoff = 10 + this.size * 2 + playerRadius * 1.5;
    this.hp = spec.hp;
    this.color = hexCss(labFor(spec.org).color);
    this.normalLooks = critterLooks(spec.org, { crown: true });
    this.dizzyLooks = critterLooks(spec.org, { crown: true, dizzy: true });
    this.doodle = new Doodle(this.normalLooks, this.size);
    const tag = makeLabel(`${spec.name} · ${spec.org}`, '#ffe3a8');
    tag.scale.set(this.size * 5, this.size * 1.25, 1);
    tag.position.y = this.size * 2.5;
    this.group.add(this.doodle.sprite, tag);
    const starLooks = frames('star', drawStar);
    for (let i = 0; i < 5; i++) {
      const s = new Doodle(starLooks, this.size * 0.12);
      s.sprite.visible = false;
      this.stars.push(s);
      this.group.add(s.sprite);
    }
    this.group.position.copy(near).add(this.tmp.randomDirection().multiplyScalar(this.standoff + 14));
    scene.add(this.group);
  }

  get maxHp(): number {
    return this.spec.hp;
  }

  get dizzy(): boolean {
    return this.state === 'dizzy';
  }

  /** The current attack pattern: lists cycle one pattern per attack phase. */
  get pattern(): BossPattern {
    const p = this.spec.pattern;
    return Array.isArray(p) ? p[this.attacks % p.length] : p;
  }

  /** Attacks get faster as the boss loses health. */
  private get fury(): number {
    return 1 + (1 - this.hp / this.maxHp) * 0.6;
  }

  private setState(s: BossState): void {
    if (s === 'attack' && this.state !== 'attack') this.attacks++;
    this.state = s;
    this.stateT = 0;
    this.cycleT = 0;
    this.lunging = false;
    for (const star of this.stars) star.sprite.visible = s === 'dizzy';
    this.doodle.setLooks(s === 'dizzy' ? this.dizzyLooks : this.normalLooks);
  }

  update(dt: number, t: number, player: THREE.Vector3): BossTick {
    const out: BossTick = { summon: 0, lunged: false };
    this.stateT += dt;
    this.cycleT += dt;
    const pos = this.group.position;
    const toPlayer = this.tmp.subVectors(player, pos);
    const dist = toPlayer.length();
    toPlayer.normalize();
    const desired = new THREE.Vector3();

    switch (this.state) {
      case 'intro':
        desired.copy(toPlayer).multiplyScalar(dist > this.standoff ? 10 * this.pace : 0);
        if (this.stateT > INTRO_SEC) {
          this.setState('attack');
          if (this.pattern === 'summon') out.summon = 2;
        }
        break;
      case 'attack':
        this.attack(dt, dist, toPlayer, desired, out);
        if (this.stateT > ATTACK_SEC) this.setState('dizzy');
        break;
      case 'dizzy':
        desired.set(Math.sin(t * 2), 0, Math.cos(t * 2)).multiplyScalar(1.5);
        if (this.stateT > DIZZY_SEC) {
          this.setState('attack');
          if (this.pattern === 'summon') out.summon = 2;
        }
        break;
      case 'recoil':
        if (this.stateT > RECOIL_SEC) this.setState('attack');
        break;
    }
    const bouncing = this.state === 'attack' && this.pattern === 'bounce';
    const k = this.lunging || bouncing ? 1 : Math.min(1, dt * 2.5);
    if (this.state !== 'recoil') this.velocity.lerp(desired, k);
    else this.velocity.multiplyScalar(1 - Math.min(1, dt * 2));
    pos.addScaledVector(this.velocity, dt);

    this.animate(t);
    this.updateShots(dt, t);
    return out;
  }

  private attack(dt: number, dist: number, toPlayer: THREE.Vector3, desired: THREE.Vector3, out: BossTick): void {
    const f = this.fury * this.pace;
    switch (this.pattern) {
      case 'charge': {
        const cycle = 1.9 / f;
        if (this.cycleT > cycle) this.cycleT = 0;
        const windup = cycle * 0.45;
        if (this.cycleT < windup) {
          // Winding up: brake and aim.
          this.lunging = false;
          this.dashDir.copy(toPlayer);
          desired.set(0, 0, 0);
        } else if (this.cycleT < cycle * 0.85) {
          if (!this.lunging) out.lunged = true;
          this.lunging = true;
          desired.copy(this.dashDir).multiplyScalar(30 * f);
        } else {
          this.lunging = false;
          desired.set(0, 0, 0);
        }
        break;
      }
      case 'spray': {
        // Keep some distance and lob hot takes.
        const side = new THREE.Vector3().crossVectors(toPlayer, THREE.Object3D.DEFAULT_UP).normalize();
        desired.copy(toPlayer).multiplyScalar((dist - this.standoff) * 0.8).addScaledVector(side, 6 * this.pace);
        this.shotTimer -= dt * this.fury;
        if (this.shotTimer <= 0) {
          this.shotTimer = 0.6;
          this.fire(toPlayer);
        }
        break;
      }
      case 'summon':
        desired.copy(toPlayer).multiplyScalar(dist > this.size + this.playerRadius + 4 ? 7 * f : 0);
        break;
      case 'orbit': {
        this.orbitAngle += dt * 1.5 * this.fury;
        const cycle = 2.4 / f;
        if (this.cycleT > cycle) this.cycleT = 0;
        if (this.cycleT > cycle * 0.7) {
          if (!this.lunging) {
            out.lunged = true;
            this.dashDir.copy(toPlayer);
          }
          this.lunging = true;
          desired.copy(this.dashDir).multiplyScalar(26 * f);
        } else {
          this.lunging = false;
          const r = this.size + this.playerRadius + 7;
          const target = new THREE.Vector3(Math.cos(this.orbitAngle) * r, Math.sin(this.orbitAngle * 0.7) * 3, Math.sin(this.orbitAngle) * r);
          const playerPos = this.group.position.clone().addScaledVector(toPlayer, dist);
          desired.subVectors(target.add(playerPos), this.group.position).multiplyScalar(2);
        }
        break;
      }
      case 'bounce': {
        // Ricochets in straight lines, bouncing off an invisible arena around you.
        const arena = this.standoff * 1.6;
        if (this.cycleT < dt * 1.5 || this.velocity.lengthSq() < 1) {
          this.dashDir.copy(toPlayer).add(new THREE.Vector3().randomDirection().multiplyScalar(0.35)).normalize();
          out.lunged = true;
        }
        if (dist > arena && this.dashDir.dot(toPlayer) < 0) {
          // Hit the wall: bounce back toward you, a little off-line.
          this.dashDir.copy(toPlayer).add(new THREE.Vector3().randomDirection().multiplyScalar(0.3)).normalize();
          out.lunged = true;
        }
        desired.copy(this.dashDir).multiplyScalar(20 * f);
        break;
      }
      case 'shockwave': {
        // Hovers, then slams out an expanding ring: be outside it, or boost through it.
        desired.copy(toPlayer).multiplyScalar((dist - this.standoff) * 0.6);
        const cycle = 2.2 / this.fury;
        if (this.cycleT > cycle) {
          this.cycleT = 0;
          this.slam();
          out.lunged = true;
        }
        break;
      }
    }
  }

  private fire(dir: THREE.Vector3): void {
    const doodle = new Doodle(frames(`shot:${this.color}`, (ctx, f) => drawShot(ctx, this.color, f)), Math.max(0.5, this.size * 0.3));
    doodle.position.copy(this.group.position).addScaledVector(dir, this.size);
    this.scene.add(doodle.sprite);
    const vel = dir.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(0.08)).setLength(17 * this.pace);
    this.shots.push({ doodle, vel, life: 3.5 });
  }

  private slam(): void {
    const doodle = new Doodle(frames(`ring:${this.color}`, (ctx, f) => drawRing(ctx, this.color, f)), 1, { opacity: 0.95 });
    doodle.position.copy(this.group.position);
    this.scene.add(doodle.sprite);
    this.rings.push({ doodle, r: this.size, speed: 11 * this.pace, max: this.standoff * 1.8 });
  }

  private updateShots(dt: number, t: number): void {
    for (const s of this.shots) {
      s.life -= dt;
      s.doodle.position.addScaledVector(s.vel, dt);
      s.doodle.material.rotation += dt * 5;
      faceTravel(s.doodle, s.vel, this.cameraRight);
      s.doodle.update(t);
    }
    for (const s of this.shots.filter((q) => q.life <= 0)) this.removeShot(s);
    for (const r of this.rings) {
      r.r += r.speed * dt;
      // The ring sprite's outline sits at ~0.92 of its half-width.
      r.doodle.radius = (r.r / 0.92) * (62 / 128);
      r.doodle.material.opacity = Math.max(0, 1 - r.r / r.max);
      r.doodle.update(t);
    }
    for (const r of this.rings.filter((q) => q.r >= q.max)) this.removeRing(r);
  }

  private removeShot(s: Shot): void {
    this.scene.remove(s.doodle.sprite);
    this.shots.splice(this.shots.indexOf(s), 1);
  }

  private removeRing(r: Ring): void {
    this.scene.remove(r.doodle.sprite);
    this.rings.splice(this.rings.indexOf(r), 1);
  }

  private animate(t: number): void {
    const d = this.doodle;
    d.radius = this.size;
    if (this.state === 'dizzy') {
      d.material.rotation = Math.sin(t * 6) * 0.3;
      // Flashing yellow: this is your chance.
      const k = 0.5 + Math.sin(t * 12) * 0.5;
      d.material.color.setRGB(1, 1, 1 - k * 0.55);
      this.stars.forEach((s, i) => {
        const a = t * 3 + (i / 5) * Math.PI * 2;
        s.position.set(Math.cos(a) * this.size * 1.1, this.size * 1.15 + Math.sin(a) * this.size * 0.25, Math.sin(a) * this.size * 0.3);
        s.update(t);
      });
    } else {
      faceTravel(d, this.velocity, this.cameraRight);
      d.material.rotation = Math.sin(t * 3) * 0.08;
      // Winding up glows red.
      const angry = this.state === 'attack' && !this.lunging && this.pattern === 'charge' ? 0.5 : 0;
      d.material.color.setRGB(1, 1 - angry * 0.6, 1 - angry * 0.6);
    }
    const wob = this.state === 'recoil' ? 1 + Math.sin(this.stateT * 30) * 0.2 : 1 + Math.sin(t * 5) * 0.05;
    const stretch = this.lunging ? 1.25 : 1;
    d.squashX = wob * stretch;
    d.squashY = 1 / wob / stretch;
    d.update(t);
  }

  /** What touching the player means right now. */
  contact(player: THREE.Vector3, playerRadius: number, boosting = false): 'bonk' | 'hurt' | null {
    const reach = this.size + playerRadius * 0.8;
    if (this.group.position.distanceTo(player) < reach) {
      if (this.state === 'dizzy') return 'bonk';
      if (this.state === 'attack' || this.state === 'intro') return 'hurt';
      return null;
    }
    for (const s of this.shots) {
      if (s.doodle.position.distanceTo(player) < playerRadius + this.size * 0.3) {
        this.removeShot(s);
        return 'hurt';
      }
    }
    // Shockwaves hit if you're right on the ring; boosting through it is safe.
    for (const r of this.rings) {
      const d = r.doodle.position.distanceTo(player);
      if (!boosting && Math.abs(d - r.r) < playerRadius * 0.9 + 0.6) {
        this.removeRing(r);
        return 'hurt';
      }
    }
    return null;
  }

  /** Takes damage and recoils. Returns true when beaten. */
  damage(n: number, from: THREE.Vector3): boolean {
    this.hp = Math.max(0, this.hp - n);
    this.velocity.subVectors(this.group.position, from).setLength(28 * this.pace);
    this.setState('recoil');
    return this.hp === 0;
  }

  /** Bumps the boss away after it hurts you. */
  repel(from: THREE.Vector3): void {
    this.velocity.subVectors(this.group.position, from).setLength(18);
    this.lunging = false;
    this.cycleT = 0;
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const s of [...this.shots]) this.removeShot(s);
    for (const r of [...this.rings]) this.removeRing(r);
  }
}
