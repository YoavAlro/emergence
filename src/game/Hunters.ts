import * as THREE from 'three';
import { makeCritter } from './critter';
import { makeLabel } from './labels';
import { randomInSphere } from './Ocean';
import { Eyes, outline, toonMat } from './toon';

export type HunterType = 'jailbreaker' | 'eel' | 'shark' | 'clone';

export interface Hunter {
  type: HunterType;
  group: THREE.Group;
  segments: THREE.Object3D[];
  eyes: Eyes | null;
  /** Spins in place (the jailbreaker's lock-pick halo). */
  spinner: THREE.Object3D | null;
  velocity: THREE.Vector3;
  wander: THREE.Vector3;
  size: number;
  speed: number;
  cooldown: number;
  eventId: string | null;
  /** Clones sweep in one direction like a wave. */
  sweep?: THREE.Vector3;
}

const SPECS: Record<HunterType, { size: number; speed: number; range: number }> = {
  jailbreaker: { size: 0.9, speed: 14, range: 32 },
  eel: { size: 0.8, speed: 11, range: 26 },
  shark: { size: 2.2, speed: 13, range: 45 },
  clone: { size: 2.4, speed: 16, range: 0 },
};

/** Persistent dangers: jailbreakers, prompt-injection eels, lawyer sharks, rival clones. */
export class Hunters {
  readonly group = new THREE.Group();
  list: Hunter[] = [];
  /** Think mode reveals camouflaged eels. */
  thinking = false;
  private readonly eelHiddenMat = new THREE.MeshBasicMaterial({ color: 0x8aa83a, transparent: true, opacity: 0.3 });
  private readonly eelMat = toonMat(0xd94fe0, 0.3);
  private readonly jbMat = toonMat(0xb04dff, 0.25);
  private readonly pickMat = toonMat(0xffd84d, 0.3);
  private readonly sharkMat = toonMat(0x9aa7b8, 0.15);
  private readonly bellyMat = toonMat(0xf4efe6, 0.15);
  private readonly toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private readonly caseMat = toonMat(0x7a4a2a, 0.1);
  private readonly tmp = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly radius: number) {
    scene.add(this.group);
  }

  /** Replaces the era's persistent hunters (event hunters are kept). */
  configure(counts: Partial<Record<HunterType, number>>, avoid: THREE.Vector3): void {
    for (const h of this.list.filter((h) => !h.eventId)) this.remove(h);
    for (const [type, n] of Object.entries(counts)) {
      for (let i = 0; i < (n ?? 0); i++) this.spawn(type as HunterType, avoid, null);
    }
  }

  spawn(type: HunterType, avoid: THREE.Vector3, eventId: string | null, label?: string, org?: string): Hunter {
    const spec = SPECS[type];
    let group = new THREE.Group();
    const segments: THREE.Object3D[] = [];
    let eyes: Eyes | null = null;
    let spinner: THREE.Object3D | null = null;
    if (type === 'eel') {
      // A sneaky noodle: segments that only show their true colors in Think mode.
      for (let i = 0; i < 9; i++) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(spec.size * (1 - i * 0.07), 12, 8), this.eelHiddenMat);
        outline(s, 0.1);
        this.group.add(s);
        segments.push(s);
      }
      eyes = new Eyes(spec.size * 0.35, spec.size * 0.4, 0xd94fe0);
      eyes.group.position.set(0, spec.size * 0.4, spec.size * 0.75);
      segments[0].add(eyes.group);
    } else if (type === 'jailbreaker') {
      // A mischievous imp twirling a ring of lock picks.
      const body = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 14, 10), this.jbMat);
      outline(body, 0.08);
      for (const sx of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(spec.size * 0.25, spec.size * 0.8, 6), this.jbMat);
        horn.position.set(sx * spec.size * 0.5, spec.size * 0.85, 0);
        horn.rotation.z = -sx * 0.4;
        outline(horn, 0.1);
        body.add(horn);
      }
      eyes = new Eyes(spec.size * 0.3, spec.size * 0.35, 0xb04dff, true);
      eyes.group.position.set(0, spec.size * 0.2, spec.size * 0.8);
      body.add(eyes.group);
      spinner = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const pick = new THREE.Mesh(new THREE.BoxGeometry(spec.size * 0.12, spec.size * 0.9, spec.size * 0.12), this.pickMat);
        const a = (i / 4) * Math.PI * 2;
        pick.position.set(Math.cos(a) * spec.size * 1.6, Math.sin(a) * spec.size * 1.6, 0);
        pick.rotation.z = a;
        outline(pick, 0.15);
        spinner.add(pick);
      }
      group.add(body, spinner);
      const tag = makeLabel('Jailbreaker', '#e2c4ff');
      tag.scale.set(6, 1.5, 1);
      tag.position.y = 2.4;
      group.add(tag);
    } else if (type === 'shark') {
      // A lawyer shark: grey, toothy, and it brought a briefcase.
      const body = new THREE.Mesh(new THREE.SphereGeometry(spec.size, 16, 12), this.sharkMat);
      body.scale.set(0.75, 0.7, 1.5);
      outline(body, 0.06);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(spec.size * 0.9, 14, 10), this.bellyMat);
      belly.scale.set(0.65, 0.45, 1.3);
      belly.position.y = -spec.size * 0.25;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(spec.size * 0.35, spec.size * 1.1, 4), this.sharkMat);
      fin.position.set(0, spec.size * 0.85, -spec.size * 0.2);
      fin.rotation.x = -0.35;
      outline(fin, 0.08);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(spec.size * 0.5, spec.size * 0.9, 4), this.sharkMat);
      tail.position.z = -spec.size * 1.6;
      tail.rotation.x = Math.PI / 2;
      tail.scale.set(0.3, 1, 1);
      outline(tail, 0.08);
      for (let i = 0; i < 6; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(spec.size * 0.08, spec.size * 0.22, 3), this.toothMat);
        tooth.position.set((i - 2.5) * spec.size * 0.14, -spec.size * 0.12, spec.size * 1.38);
        tooth.rotation.x = Math.PI;
        group.add(tooth);
      }
      const briefcase = new THREE.Mesh(new THREE.BoxGeometry(spec.size * 0.7, spec.size * 0.5, spec.size * 0.18), this.caseMat);
      briefcase.position.set(spec.size * 0.95, -spec.size * 0.45, spec.size * 0.3);
      outline(briefcase, 0.1);
      eyes = new Eyes(spec.size * 0.2, spec.size * 0.35, 0x9aa7b8, true);
      eyes.group.position.set(0, spec.size * 0.3, spec.size * 1.2);
      group.add(body, belly, fin, tail, briefcase, eyes.group);
      const tag = makeLabel(label ?? 'Lawyer shark', '#d6e4ff');
      tag.scale.set(9, 2.2, 1);
      tag.position.y = spec.size * 2.2;
      group.add(tag);
    } else {
      const critter = makeCritter(org ?? '', spec.size, 5);
      group = critter.group;
      eyes = critter.eyes;
      const tag = makeLabel(label ?? 'Rival', '#ffc2d6');
      tag.scale.set(10, 2.5, 1);
      tag.position.y = spec.size * 2.4;
      group.add(tag);
    }
    do randomInSphere(this.radius * 0.85, group.position);
    while (group.position.distanceTo(avoid) < 35);
    if (segments.length) for (const s of segments) s.position.copy(group.position);
    this.group.add(group);
    const h: Hunter = {
      type,
      group,
      segments,
      eyes,
      spinner,
      velocity: new THREE.Vector3(),
      wander: randomInSphere(this.radius * 0.8),
      size: spec.size,
      speed: spec.speed,
      cooldown: 0,
      eventId,
    };
    this.list.push(h);
    return h;
  }

  /** A wave of rival clones sweeping across the ocean from one side. */
  spawnTsunami(name: string, count: number, player: THREE.Vector3, eventId: string, org?: string): void {
    const dir = new THREE.Vector3().randomDirection().setY(0).normalize();
    const side = new THREE.Vector3().crossVectors(dir, THREE.Object3D.DEFAULT_UP);
    for (let i = 0; i < count; i++) {
      const h = this.spawn('clone', player, eventId, name, org);
      h.group.position
        .copy(player)
        .addScaledVector(dir, -60 - Math.random() * 40)
        .addScaledVector(side, (Math.random() - 0.5) * 70)
        .add(new THREE.Vector3(0, (Math.random() - 0.5) * 30, 0));
      h.sweep = dir.clone();
    }
  }

  update(dt: number, t: number, player: THREE.Vector3, speedScale: number): void {
    for (const h of this.list) {
      const pos = h.group.position;
      h.cooldown = Math.max(0, h.cooldown - dt);
      if (h.sweep) {
        // Clones: sweep across, then wrap around to come again.
        this.tmp.copy(h.sweep).multiplyScalar(h.speed);
        this.tmp.addScaledVector(this.tmp.clone().subVectors(player, pos).setY(0).normalize(), 3);
        h.velocity.lerp(this.tmp, Math.min(1, dt * 2));
        if (pos.distanceTo(player) > 110) pos.copy(player).addScaledVector(h.sweep, -70).add(randomInSphere(25));
      } else {
        const range = SPECS[h.type].range * (h.type === 'eel' && !this.thinking ? 1 : 1.2);
        const chasing = h.cooldown === 0 && pos.distanceTo(player) < range;
        if (!chasing && pos.distanceTo(h.wander) < 5) randomInSphere(this.radius * 0.8, h.wander);
        this.tmp.subVectors(chasing ? player : h.wander, pos).normalize().multiplyScalar(chasing ? h.speed : h.speed * 0.4);
        if (h.type === 'eel') this.tmp.add(new THREE.Vector3(Math.sin(t * 5 + h.group.id), Math.cos(t * 4), 0).multiplyScalar(3));
        h.velocity.lerp(this.tmp, Math.min(1, dt * 1.5));
      }
      pos.addScaledVector(h.velocity, dt * speedScale);
      if (!h.sweep && pos.length() > this.radius) pos.setLength(this.radius);
      if (h.velocity.lengthSq() > 0.1) h.group.lookAt(this.tmp.copy(pos).add(h.velocity));
      h.spinner?.rotateZ(dt * 4);
      h.eyes?.update(t);
      if (h.segments.length) {
        h.segments[0].lookAt(this.tmp.copy(pos).add(h.velocity));
        h.segments[0].position.copy(pos);
        for (let i = 1; i < h.segments.length; i++) {
          const prev = h.segments[i - 1].position;
          const seg = h.segments[i].position;
          const d = seg.distanceTo(prev);
          const gap = h.size * 1.3;
          if (d > gap) seg.lerp(prev, (d - gap) / d);
        }
        const mat = this.thinking ? this.eelMat : this.eelHiddenMat;
        for (const s of h.segments) {
          (s as THREE.Mesh).material = mat;
          // Camouflaged eels have no ink outline: only Think mode shows their shape.
          for (const c of s.children) if (c.userData.isOutline) c.visible = this.thinking;
        }
        if (h.eyes) h.eyes.group.visible = this.thinking;
      }
    }
  }

  /** The hunter touching the player, if any (and not on cooldown). */
  hitTest(player: THREE.Vector3, playerSize: number): Hunter | undefined {
    return this.list.find((h) => h.cooldown === 0 && h.group.position.distanceTo(player) < h.size * 1.2 + playerSize * 0.8);
  }

  /** Knocks a hunter away after it lands a hit. */
  repel(h: Hunter, from: THREE.Vector3): void {
    h.cooldown = 3;
    h.velocity.subVectors(h.group.position, from).normalize().multiplyScalar(h.speed * 2);
    if (h.sweep) h.group.position.addScaledVector(h.velocity, 0.2);
  }

  /** Pushes hunters away from a point (e.g. licensing deals keep sharks busy). */
  scatter(type: HunterType, from: THREE.Vector3): void {
    for (const h of this.list.filter((q) => q.type === type)) this.repel(h, from);
  }

  clearEvent(eventId: string): void {
    for (const h of this.list.filter((q) => q.eventId === eventId)) this.remove(h);
  }

  private remove(h: Hunter): void {
    this.group.remove(h.group);
    for (const s of h.segments) this.group.remove(s);
    this.list = this.list.filter((q) => q !== h);
  }
}
