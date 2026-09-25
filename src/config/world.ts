import type { Mix } from './types';

/** The live-internet biome behind the portals (Stage 4+): fresher, tool-heavy, and full of eels. */
export const INTERNET_BIOME = {
  /** Added on top of the era's spawn mix while you're inside. */
  extraSpawn: { tools: 0.35, web: 0.25, news: 0.05 } as Mix,
  extraEels: 3,
  userGain: 1.3,
  seconds: 60,
  enterToast: 'You swam into the live internet: fresh pages and tool calls, but watch for injection eels hiding in the text.',
  exitToast: 'Back in the training ocean.',
};

/** Toasts for persistent dangers. Kept here so the engine carries no history. */
export const DANGER_TEXT = {
  hallucination: 'Hallucination! You confidently learned something false.',
  rewardHack: 'Reward hacking! That "feedback" gamed the reward model. Alignment drops.',
  smog: 'Toxic data: spam and hate speech. Get out before it sticks.',
  scandal: 'PR scandal! Toxic outputs went viral. You lost 25% of your training data.',
  jailbreak: 'Jailbroken! A trick prompt got past your guardrails.',
  jailbreakResisted: 'Your principles held against a jailbreak attempt.',
  injection: 'Prompt injection! You followed instructions hidden in a web page.',
  injectionBlocked: 'Injection blocked: you trust your instructions over text you read.',
  shark: 'Copyright claim! A lawyer shark took a bite out of your data.',
  overfit: 'Overfitting! You memorized one kind of data instead of generalizing.',
  collapse: 'Model collapse! Too much synthetic data made your outputs bland and wrong.',
  overRefusal: 'Over-refusal: you refused a harmless request, and users drift away.',
  constitutionLow: 'Your Constitution is weak: toxic smog hits much harder.',
  rogueFork: 'A fork went rogue: it picked up a prompt injection.',
  edge: 'The edge of the dataset. Nothing out there yet.',
  computeEmpty: 'Out of compute! Slow down and let it refill.',
};

/** Shown when a mechanic unlocks. `{key}` placeholders are filled per device. */
export const ABILITY_INTRO: Record<string, string> = {
  editor: 'Creature editor unlocked: spend EP on parts ({editor}).',
  alignment: 'Alignment meter: eat Human Feedback to raise it. Toxic data and jailbreakers lower it.',
  users: 'Users meter: every piece you eat now wins users. Ride the Timeline Current for ×3.',
  timeline: 'The Timeline Current is flowing: a fast river of posts. Ride it to go viral.',
  constitution: 'Constitution meter: eat principles to raise it. Too low and smog hurts more; too high and you over-refuse.',
  tools: 'Tool limbs: hold {grab} to pull data toward you (costs compute).',
  portals: 'Portals to the live internet have opened. Swim through a green ring.',
  think: 'Think mode: hold {think} to slow time, see hidden reasoning traces, and spot fakes (they turn grey).',
  fork: 'Fork sub-agents: {fork} to fork, {target} to pick their target, {recall} to recall. Keep them out of smog.',
  teams: 'Agent Teams: your forks share targets and deliver directly.',
  trust: 'Trust meter: regulators and the public are watching. Feedback, safeguards, and clean storms build it.',
  sizeForms: 'Size forms: switch between tiers with {form}. Small is fast and cheap; large reaches further.',
};

/** Shown when your diet is ready but a gate isn't. */
export const GATE_HINTS: Record<string, string> = {
  Alignment: 'Raise Alignment: eat Human Feedback (and principles), avoid jailbreakers, smog, and fake feedback.',
  Users: 'Win users: keep eating, ride the Timeline Current (×3), and grab viral screenshots.',
  Trust: 'Build Trust: eat Human Feedback and principles, equip the Safeguard shell, and survive storms cleanly.',
  Constitution: 'Constitution out of band: eat principles to raise it, or wait for it to fade if it is too high.',
};
