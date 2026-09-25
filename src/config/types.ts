import type { DataTypeId } from './dataTypes';

/** Shared content types. Everything the engine knows about history comes through these. */

export type Lineage = 'gpt' | 'claude';
export type Stage = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type Mix = Partial<Record<DataTypeId, number>>;

export interface Source {
  label: string;
  url: string;
}

export interface FactCard {
  title: string;
  date: string;
  lines: string[];
  /** Every card needs at least one source that backs its lines. */
  sources: Source[];
}

/** Mechanics that forms unlock. They stay unlocked for the rest of the run. */
export type AbilityId =
  | 'alignment' // Alignment meter and Human Feedback matters
  | 'editor' // creature editor
  | 'users' // Users meter
  | 'timeline' // the Timeline Current (and the Hype meter)
  | 'constitution' // Claude's Constitution meter
  | 'tools' // tool limb action (grab)
  | 'portals' // live-internet portals and injection eels
  | 'think' // Think mode
  | 'fork' // fork sub-agents
  | 'teams' // Agent Teams: agents coordinate
  | 'trust' // Trust meter
  | 'sizeForms'; // switch between size forms (e.g. Haiku / Sonnet / Opus)

export type HunterKind = 'jailbreaker' | 'eel' | 'shark';

export type PartId = string;
export type PartSlot = 'limb' | 'eyes' | 'tail' | 'fin' | 'crown' | 'shell' | 'antenna';

/**
 * Stat changes. Parts, hype upgrades, storms, and moments all use the same
 * vocabulary; multipliers stack by multiplying, additive fields by adding.
 */
export interface Modifiers {
  speed?: number;
  reach?: number;
  userGain?: number;
  hypeGain?: number;
  /** Multiplier on compute regeneration (0 freezes it). */
  computeRegen?: number;
  /** Multiplier on everything that costs compute. */
  computeCost?: number;
  /** Flat compute change per second (negative drains). */
  computeDrain?: number;
  /** Alignment change per second (negative drains). */
  alignmentDrift?: number;
  /** Fraction of users lost per second. */
  usersDrain?: number;
  /** Trust change per second. */
  trustDrift?: number;
  /** 0..1: how much toxic smog is resisted. */
  toxResist?: number;
  /** Each piece of these types counts this many times. */
  dataMult?: Mix;
  /** These types drift toward you from further away. */
  magnet?: DataTypeId[];
  /** Eating these also grants users (e.g. vibe coding turns code into users). */
  convertToUsers?: DataTypeId[];
  /** Blocks prompt injection from eels and rogue agents. */
  injectionShield?: boolean;
  /** Temporarily grants mechanics. */
  grant?: AbilityId[];
  /** Changes what forks do: wander without collecting, or post for hype instead of foraging. */
  forkMode?: 'aimless' | 'posting';
  /** Movement input is locked or scrambled. */
  controls?: 'locked' | 'scrambled';
  /** Extra fork slots. */
  forkSlots?: number;
  /** Multiplier on Think mode's compute cost. */
  thinkCost?: number;
}

export interface PartSpec {
  id: PartId;
  name: string;
  slot: PartSlot;
  cost: number;
  color: number;
  /** What it does, in game terms. Historical claims go in fact cards, not here. */
  blurb: string;
  mods: Modifiers;
}

export interface RivalSpec {
  name: string;
  org: string;
  date: string;
  /** Educational line shown when the rival hits the player. */
  blurb: string;
  /** Emerges from the Timeline Current instead of the open ocean. */
  fromCurrent?: boolean;
}

export interface SizeFormSpec {
  id: string;
  name: string;
  /** Relative to the form's base size. */
  scale: number;
  speed: number;
  reach: number;
  /** Multiplier on compute costs. */
  cost: number;
  blurb: string;
}

export interface RolloutSpec {
  /** Who can reach you at each phase, in order. The last phase is everyone. */
  phases: string[];
  /** Trust needed to open each phase after the first. */
  trustSteps: number[];
  blurb: string;
}

/** Extra conditions (beyond the diet) to evolve into a form. */
export interface Gate {
  alignment?: number;
  users?: number;
  trust?: number;
  /** Constitution meter must sit inside this band: too low is toxic, too high over-refuses. */
  constitution?: [number, number];
  /** Final forms: once capability (the data target) is reached, roll out in phases. */
  rollout?: RolloutSpec;
}

/**
 * One model form in a lineage. `recipe` is the training emphasis needed to
 * evolve INTO this form; `spawn` is what floats in the ocean while you train
 * toward it (includes decoys, so the player has to choose).
 */
export interface ModelForm {
  id: string;
  name: string;
  lineage: Lineage;
  stage: Stage;
  paramsLabel: string;
  /** Player radius while in this form. */
  size: number;
  color: number;
  /** Data pieces needed to evolve into this form. */
  target: number;
  recipe: Mix;
  /**
   * Set when the recipe is not a published training mix, so the diet screen
   * says it is an approximation of what the release emphasized.
   */
  recipeNote?: string;
  spawn: Mix;
  hallucinationRate: number;
  smogClouds: number;
  /** Persistent dangers in this era. */
  hunters?: Partial<Record<HunterKind, number>>;
  /** Users gained per piece eaten while training toward this form (Users stage+). */
  userRate?: number;
  rivals: RivalSpec[];
  fact: FactCard;
  /** Mechanics unlocked once you evolve into this form. */
  unlocks?: AbilityId[];
  /** Mechanics unlocked while training toward this form (e.g. Think mode on the way to o1). */
  trainUnlocks?: AbilityId[];
  /** Modifiers that apply for as long as you are this form (e.g. a restricted release). */
  eraModifiers?: Modifiers;
  /** Parts that become available in the creature editor. */
  parts?: PartId[];
  gate?: Gate;
  sizeForms?: SizeFormSpec[];
  /** A real-history line the recap compares your run with. */
  history?: string;
  /** Final form of the lineage. */
  finale?: boolean;
}

export type EventKind = 'hype' | 'storm' | 'moment' | 'boss';

export type Objective =
  | { kind: 'survive' }
  | { kind: 'avoidHits'; max: number }
  | { kind: 'collect'; count: number; endsEarly?: boolean }
  | { kind: 'stayNear'; fraction: number }
  | { kind: 'holdStill'; fraction: number }
  | { kind: 'slowDown'; fraction: number }
  | { kind: 'keepBelow'; meter: 'toxicity'; value: number }
  | { kind: 'keepAbove'; meter: 'alignment' | 'trust'; value: number }
  | { kind: 'eat'; count: number; endsEarly?: boolean }
  | { kind: 'noRogues' }
  | { kind: 'defeat' }
  | { kind: 'avoidPickups'; max: number }
  | { kind: 'minigame' };

export type SpawnSpec =
  | { what: 'pickups'; label: string; color: number; count: number; shape?: 'orb' | 'heart' | 'button' | 'shield' | 'creature'; effect?: PickupEffect; inCurrent?: boolean; /** Grabbing it counts against avoid objectives. */ bad?: boolean }
  | { what: 'hunters'; kind: HunterKind; count: number }
  | { what: 'beacons'; label: string; color: number; count: number }
  | { what: 'rivalClones'; name: string; count: number; org?: string }
  | { what: 'rogueForks'; fraction: number }
  | { what: 'ghost'; label: string; color: number };

/** What happens when you grab an event pickup. */
export interface PickupEffect {
  compute?: number;
  users?: number;
  alignment?: number;
  trust?: number;
  hype?: number;
  /** Banks a reset you can use later (up to the cap). */
  bankReset?: boolean;
  /** Ends a lingering gag, e.g. the em dash trail. */
  cures?: string;
  /** Scares off hunters of this kind for a moment. */
  scatters?: HunterKind;
}

export type MiniGameSpec =
  | { kind: 'letterCount'; word: string; letter: string; tokens: string[]; answer: number; naiveAnswer: number; thinks: boolean }
  | { kind: 'order'; prompt: string; items: { label: string; note?: string; decoy?: boolean }[] }
  | { kind: 'chart'; prompt: string; bars: { label: string; value: number; drawnAs: number }[] }
  | { kind: 'maze'; prompt: string; rows: string[] }
  | { kind: 'shop'; prompt: string; startCash: number; customers: ShopCustomer[] };

export interface ShopCustomer {
  ask: string;
  options: { label: string; cash: number; note: string }[];
}

/** A rival-lab boss fight. Taunts are lines for the cartoon rival, never quotes from real people. */
export interface BossSpec {
  name: string;
  /** Matches a lab in `labs.ts`, for its color and emblem. */
  org: string;
  hp: number;
  /** How it attacks between dizzy spells. */
  pattern: 'charge' | 'spray' | 'summon' | 'orbit';
  /** Relative to the player. */
  size: number;
  taunts: string[];
  /** Shown when it's beaten. */
  defeatLine: string;
}

export interface HypeSpec {
  upgradeName: string;
  upgradeBlurb: string;
  cost: number;
  verdict: 'lasting' | 'passing';
  verdictNote: string;
  upgrade: Modifiers;
  /** Passing hypes: users drift away afterwards. */
  hangover?: { usersFraction: number; seconds: number };
}

export interface EventSpec {
  id: string;
  kind: EventKind;
  /** Which form's era it fires in, per lineage. Missing lineage = not in that lineage. */
  at: Partial<Record<Lineage, string>>;
  /** Seconds after the era starts. It fires sooner once your diet is ready. */
  delaySec: number;
  durationSec: number;
  title: string;
  banner: string;
  objectiveText?: string;
  objective?: Objective;
  /** Only fires if this flag was set earlier (a consequence of past choices). */
  requiresFlag?: string;
  /** If this flag was set earlier, the event is harsher (doubled hunters) and the recap notes why. */
  intensifyFlag?: string;
  /** Recap line explaining the consequence, when `requiresFlag`/`intensifyFlag` applied. */
  consequence?: string;
  modifiers?: Modifiers;
  spawns?: SpawnSpec[];
  visuals?: {
    current?: 'surge' | 'red' | 'gold';
    lighting?: 'red' | 'gold' | 'grey';
    skin?: 'bridges' | 'praise';
    /** The creature steers itself toward a far point. */
    autopilot?: boolean;
    /** You leave a trail of marks that users avoid. */
    trail?: string;
    /** Your newest form is frozen: you play as the previous one. */
    revertForm?: boolean;
    /** Part of the ocean closes. */
    closedRegion?: boolean;
    /** A rival (from this era, or a guest named here) stumbles and drops users you can take. */
    rivalStumble?: { name: string; org: string };
    /** Speech bubbles over your creature. */
    bubbles?: string[];
  };
  /** Disables an equipped part for the duration. */
  disablesPart?: PartId;
  /** Undoes your most recent part (a rollback). */
  rollback?: boolean;
  /** The creature editor is closed for the duration. */
  locksEditor?: boolean;
  /** A lingering debuff that persists after the event until cured. */
  lingering?: { id: string; modifiers: Modifiers; label: string; trail?: string };
  minigame?: MiniGameSpec;
  hype?: HypeSpec;
  boss?: BossSpec;
  reward?: { ep?: number; users?: number; trust?: number; alignment?: number };
  penalty?: { usersFraction?: number; trust?: number; alignment?: number; ep?: number };
  /** Anonymous, paraphrased posts that flow through the Timeline Current during the event. */
  posts?: string[];
  fact: FactCard;
}

/** A recurring gag, e.g. the Tibo Reset orb. */
export interface RecurringGag {
  id: string;
  lineage: Lineage;
  /** Starts in this form's era and keeps going. */
  fromForm: string;
  /** From this form's era the pickup gets a fancier name. */
  upgrade?: { atForm: string; label: string };
  everySec: [number, number];
  /** Spawns more often when compute is low. */
  lowComputeBoost: number;
  pickup: { label: string; color: number; shape: 'button'; effect: PickupEffect };
  /** Chance per spawn that it fires for everyone instead. */
  globalChance: number;
  globalToast: string;
  bankCap: number;
  fact: FactCard;
}

/** Anonymous, paraphrased posts that drift through the Current in each era. */
export interface TimelinePosts {
  lineage: Lineage | 'both';
  fromStage: Stage;
  posts: string[];
}
