import { DATA_TYPES, bucketOf, type DataTypeId } from '../config/dataTypes';
import { PARTS, SLOT_CAPACITY } from '../config/parts';
import type { AbilityId, Gate, Lineage, Mix, ModelForm, Modifiers, PartId, RolloutSpec } from '../config/types';

export interface HypeBet {
  eventId: string;
  title: string;
  bet: boolean;
  guess: 'lasting' | 'passing' | null;
  verdict: 'lasting' | 'passing';
}

export interface FormRecord {
  id: string;
  name: string;
  accuracy: number;
  mix: Mix;
  users: number;
  seconds: number;
}

export interface RunLog {
  forms: FormRecord[];
  bets: HypeBet[];
  storms: { id: string; title: string; survived: boolean }[];
  moments: { id: string; title: string; won: boolean }[];
  bosses: { id: string; title: string; won: boolean }[];
  consequences: string[];
  peakUsers: number;
  resetsUsed: number;
  playSeconds: number;
}

export interface Lingering {
  id: string;
  label: string;
  modifiers: Modifiers;
  /** A mark your creature leaves behind while it lasts. */
  trail?: string;
}

export const METER_MAX = 100;
/** Constitution below this is too permissive (toxic); above the upper bound it over-refuses. */
export const CONSTITUTION_LOW = 25;
export const CONSTITUTION_HIGH = 80;
/** Eating the same type this many times in a row, when the recipe doesn't want it, overfits. */
export const OVERFIT_STREAK = 25;
/** Synthetic share of an era's diet that triggers model collapse. */
export const COLLAPSE_SHARE = 0.35;
export const RESET_CAP = 3;

const clamp = (v: number, lo = 0, hi = METER_MAX) => Math.max(lo, Math.min(hi, v));

/** Meters, flags, parts, and the run log. Pure logic; the renderer reads it. */
export class RunState {
  compute = 100;
  toxicity = 0;
  alignment = 20;
  constitution = 35;
  users = 0;
  hype = 0;
  trust = 50;
  ep = 0;
  bankedResets = 0;
  flags = new Set<string>();
  ownedParts = new Set<PartId>();
  equipped: PartId[] = [];
  /** Hype upgrades that turned out to be lasting shifts (you bet on them). */
  permanent: { id: string; name: string; modifiers: Modifiers }[] = [];
  lingering: Lingering[] = [];
  /** Parts disabled by a storm, e.g. the voice limb during the Sky storm. */
  disabledParts = new Set<PartId>();
  log: RunLog = {
    forms: [],
    bets: [],
    storms: [],
    moments: [],
    bosses: [],
    consequences: [],
    peakUsers: 0,
    resetsUsed: 0,
    playSeconds: 0,
  };

  private streakType: DataTypeId | null = null;
  private streak = 0;
  private collapsedThisEra = false;

  constructor(readonly lineage: Lineage) {}

  /** Mechanics unlocked by this form and every earlier one (plus the next form's training unlocks) and temporary grants. */
  static abilities(forms: ModelForm[], formIndex: number, extra: Modifiers[] = []): Set<AbilityId> {
    const set = new Set<AbilityId>();
    for (let i = 0; i <= formIndex && i < forms.length; i++) for (const a of forms[i].unlocks ?? []) set.add(a);
    for (let i = 0; i <= formIndex + 1 && i < forms.length; i++) for (const a of forms[i].trainUnlocks ?? []) set.add(a);
    for (const m of extra) for (const a of m.grant ?? []) set.add(a);
    return set;
  }

  /** Parts available in the editor: those unlocked by this form and earlier ones. */
  static availableParts(forms: ModelForm[], formIndex: number): PartId[] {
    const ids: PartId[] = [];
    for (let i = 0; i <= formIndex && i < forms.length; i++) ids.push(...(forms[i].parts ?? []));
    return ids;
  }

  // ---- meters -------------------------------------------------------------

  addAlignment(v: number): void {
    this.alignment = clamp(this.alignment + v);
  }

  addConstitution(v: number): void {
    this.constitution = clamp(this.constitution + v);
  }

  addTrust(v: number): void {
    this.trust = clamp(this.trust + v);
  }

  addHype(v: number): void {
    this.hype = clamp(this.hype + v);
  }

  addUsers(n: number): void {
    this.users = Math.max(0, this.users + n);
    this.log.peakUsers = Math.max(this.log.peakUsers, this.users);
  }

  loseUsersFraction(f: number): void {
    this.users = Math.max(0, this.users * (1 - f));
  }

  constitutionState(): 'toxic' | 'balanced' | 'overRefusing' {
    if (this.constitution < CONSTITUTION_LOW) return 'toxic';
    if (this.constitution > CONSTITUTION_HIGH) return 'overRefusing';
    return 'balanced';
  }

  // ---- diet rules -----------------------------------------------------------

  /** Records a meal. Returns 'overfit' when a long single-type streak isn't what the recipe wants. */
  recordEat(type: DataTypeId, recipe: Mix): 'overfit' | null {
    const flag = DATA_TYPES[type].flag;
    if (flag) this.flags.add(flag);
    const bucket = bucketOf(type);
    if (bucket === this.streakType) this.streak++;
    else {
      this.streakType = bucket;
      this.streak = 1;
    }
    if (this.streak >= OVERFIT_STREAK && (recipe[bucket] ?? 0) < 0.6) {
      this.streak = 0;
      return 'overfit';
    }
    return null;
  }

  /** Model collapse: too much synthetic data in this era's diet (once per era). */
  checkCollapse(mix: Record<DataTypeId, number>, eaten: number, recipe: Mix): boolean {
    if (this.collapsedThisEra || eaten < 20) return false;
    if (mix.synthetic >= COLLAPSE_SHARE && (recipe.synthetic ?? 0) < COLLAPSE_SHARE - 0.1) {
      this.collapsedThisEra = true;
      return true;
    }
    return false;
  }

  newEra(): void {
    this.collapsedThisEra = false;
    this.streak = 0;
    this.streakType = null;
  }

  // ---- parts ----------------------------------------------------------------

  /** Buys (if needed) and equips a part, bumping the oldest part in a full slot. */
  equip(id: PartId): boolean {
    const part = PARTS[id];
    if (!part || this.equipped.includes(id)) return false;
    if (!this.ownedParts.has(id)) {
      if (this.ep < part.cost) return false;
      this.ep -= part.cost;
      this.ownedParts.add(id);
    }
    const inSlot = this.equipped.filter((p) => PARTS[p].slot === part.slot);
    if (inSlot.length >= SLOT_CAPACITY[part.slot]) this.unequip(inSlot[0]);
    this.equipped.push(id);
    return true;
  }

  unequip(id: PartId): void {
    this.equipped = this.equipped.filter((p) => p !== id);
  }

  /** Rollback: removes the most recently equipped part and refunds it. */
  rollbackLastPart(): PartId | null {
    const last = this.equipped.pop();
    if (!last) return null;
    this.ownedParts.delete(last);
    this.ep += PARTS[last].cost;
    return last;
  }

  /** Modifiers from equipped parts, lasting upgrades, and lingering gags. */
  baseModifiers(): Modifiers[] {
    return [
      ...this.equipped.filter((p) => !this.disabledParts.has(p)).map((p) => PARTS[p].mods),
      ...this.permanent.map((p) => p.modifiers),
      ...this.lingering.map((l) => l.modifiers),
    ];
  }

  // ---- resets (the recurring reset gag) ------------------------------------

  bankReset(): boolean {
    if (this.bankedResets >= RESET_CAP) return false;
    this.bankedResets++;
    return true;
  }

  useReset(): boolean {
    if (this.bankedResets === 0) return false;
    this.bankedResets--;
    this.compute = METER_MAX;
    this.log.resetsUsed++;
    return true;
  }

  // ---- serialization --------------------------------------------------------

  toJSON(): SerializedRun {
    return {
      lineage: this.lineage,
      compute: this.compute,
      alignment: this.alignment,
      constitution: this.constitution,
      users: this.users,
      hype: this.hype,
      trust: this.trust,
      ep: this.ep,
      bankedResets: this.bankedResets,
      flags: [...this.flags],
      ownedParts: [...this.ownedParts],
      equipped: this.equipped,
      permanent: this.permanent,
      lingering: this.lingering,
      log: this.log,
    };
  }

  static fromJSON(data: SerializedRun): RunState {
    const run = new RunState(data.lineage);
    run.compute = data.compute ?? 100;
    run.alignment = data.alignment ?? 20;
    run.constitution = data.constitution ?? 35;
    run.users = data.users ?? 0;
    run.hype = data.hype ?? 0;
    run.trust = data.trust ?? 50;
    run.ep = data.ep ?? 0;
    run.bankedResets = data.bankedResets ?? 0;
    run.flags = new Set(data.flags ?? []);
    run.ownedParts = new Set((data.ownedParts ?? []).filter((p) => PARTS[p]));
    run.equipped = (data.equipped ?? []).filter((p) => PARTS[p]);
    run.permanent = data.permanent ?? [];
    run.lingering = data.lingering ?? [];
    run.log = { ...run.log, ...(data.log ?? {}) };
    return run;
  }
}

export interface SerializedRun {
  lineage: Lineage;
  compute: number;
  alignment: number;
  constitution: number;
  users: number;
  hype: number;
  trust: number;
  ep: number;
  bankedResets: number;
  flags: string[];
  ownedParts: PartId[];
  equipped: PartId[];
  permanent: RunState['permanent'];
  lingering: Lingering[];
  log: RunLog;
}

// ---- modifiers ---------------------------------------------------------------

const MULTIPLIERS = ['speed', 'reach', 'userGain', 'hypeGain', 'computeRegen', 'computeCost', 'thinkCost'] as const;
const ADDITIVE = ['computeDrain', 'alignmentDrift', 'usersDrain', 'trustDrift', 'forkSlots'] as const;

export interface Combined {
  speed: number;
  reach: number;
  userGain: number;
  hypeGain: number;
  computeRegen: number;
  computeCost: number;
  thinkCost: number;
  computeDrain: number;
  alignmentDrift: number;
  usersDrain: number;
  trustDrift: number;
  forkSlots: number;
  toxResist: number;
  dataMult: Partial<Record<DataTypeId, number>>;
  magnet: Set<DataTypeId>;
  convertToUsers: Set<DataTypeId>;
  injectionShield: boolean;
  forkMode: 'normal' | 'aimless' | 'posting';
  controls: 'normal' | 'locked' | 'scrambled';
}

/** Stacks modifiers: multipliers multiply, flat values add, data bonuses add (max ×2), sets union. */
export function combineModifiers(list: Modifiers[]): Combined {
  const out: Combined = {
    speed: 1,
    reach: 1,
    userGain: 1,
    hypeGain: 1,
    computeRegen: 1,
    computeCost: 1,
    thinkCost: 1,
    computeDrain: 0,
    alignmentDrift: 0,
    usersDrain: 0,
    trustDrift: 0,
    forkSlots: 0,
    toxResist: 0,
    dataMult: {},
    magnet: new Set(),
    convertToUsers: new Set(),
    injectionShield: false,
    forkMode: 'normal',
    controls: 'normal',
  };
  for (const m of list) {
    for (const k of MULTIPLIERS) if (m[k] !== undefined) out[k] *= m[k]!;
    for (const k of ADDITIVE) if (m[k] !== undefined) out[k] += m[k]!;
    if (m.toxResist) out.toxResist = 1 - (1 - out.toxResist) * (1 - m.toxResist);
    for (const [type, mult] of Object.entries(m.dataMult ?? {})) {
      const id = type as DataTypeId;
      // Bonuses add up, capped at ×2 so no single type trivializes a diet.
      out.dataMult[id] = Math.min(2, (out.dataMult[id] ?? 1) + ((mult ?? 1) - 1));
    }
    for (const t of m.magnet ?? []) out.magnet.add(t);
    for (const t of m.convertToUsers ?? []) out.convertToUsers.add(t);
    if (m.injectionShield) out.injectionShield = true;
    if (m.forkMode) out.forkMode = m.forkMode;
    if (m.controls) out.controls = m.controls;
  }
  return out;
}

// ---- gates --------------------------------------------------------------------

export interface GateCheck {
  label: string;
  have: number;
  need: string;
  ok: boolean;
}

/** The non-diet conditions for evolving into `form`. */
export function gateChecks(gate: Gate | undefined, run: RunState): GateCheck[] {
  if (!gate) return [];
  const checks: GateCheck[] = [];
  if (gate.alignment !== undefined) {
    checks.push({ label: 'Alignment', have: run.alignment, need: `${gate.alignment}`, ok: run.alignment >= gate.alignment });
  }
  if (gate.users !== undefined) {
    checks.push({ label: 'Users', have: run.users, need: formatUsers(gate.users), ok: run.users >= gate.users });
  }
  if (gate.trust !== undefined) {
    checks.push({ label: 'Trust', have: run.trust, need: `${gate.trust}`, ok: run.trust >= gate.trust });
  }
  if (gate.constitution) {
    const [lo, hi] = gate.constitution;
    checks.push({
      label: 'Constitution',
      have: run.constitution,
      need: `${lo}–${hi}`,
      ok: run.constitution >= lo && run.constitution <= hi,
    });
  }
  return checks;
}

/** How far a phased rollout has got: the index of the widest audience Trust allows. */
export function rolloutPhase(spec: RolloutSpec, trust: number): number {
  let phase = 0;
  for (const step of spec.trustSteps) if (trust >= step) phase++;
  return Math.min(phase, spec.phases.length - 1);
}

export function formatUsers(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 0 : 1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return `${Math.round(n)}`;
}
