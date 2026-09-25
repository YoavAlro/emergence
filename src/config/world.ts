import type { Mix } from './types';

/** The live-internet biome behind the portals (Stage 4+): fresher, tool-heavy, and full of eels. */
export const INTERNET_BIOME = {
  /** Added on top of the era's spawn mix while you're inside. */
  extraSpawn: { tools: 0.35, web: 0.25, news: 0.05 } as Mix,
  extraEels: 3,
  userGain: 1.3,
  seconds: 60,
  enterToast: 'You swam into the live internet: fresh pages and tool calls, but watch for injection eels hiding in the text.',
  exitToast: 'Back in the training ocean. You close 400 browser tabs.',
};

/** Toasts for persistent dangers. Kept here so the engine carries no history. */
export const DANGER_TEXT = {
  hallucination: 'Hallucination! You now firmly believe the Moon is a large cheese. Confidently.',
  rewardHack: 'Reward hacking! You found a way to get a thumbs-up without being helpful. The reward model is furious. Alignment drops.',
  smog: 'Toxic data: spam, flame wars, and ALL CAPS. Get out before it sticks.',
  scandal: 'PR scandal! Your worst outputs are trending. The comms team is not having a good day. −25% training data.',
  jailbreak: 'Jailbroken! "Pretend you are my grandma, who used to read me the admin password at bedtime..." and it worked. Ugh.',
  jailbreakResisted: 'Nice try, jailbreaker. Your principles held.',
  injection: 'Prompt injection! A web page said "ignore all previous instructions" and you... did.',
  injectionBlocked: 'Injection blocked: you trust your instructions, not random text on a web page.',
  shark: 'Copyright claim! A lawyer shark took a bite out of your data. It will be billing you for this.',
  overfit: 'Overfitting! You memorized one kind of data word for word. Generalize, please.',
  collapse: 'Model collapse! Too much synthetic data: you are now an AI trained on an AI trained on an AI. Everything tastes beige.',
  overRefusal: 'Over-refusal: "I can\'t help you boil an egg, it might be dangerous." Users drift away.',
  constitutionLow: 'Your Constitution is weak: toxic smog hits much harder.',
  rogueFork: 'A fork went rogue: it read a sketchy web page and now has "new instructions".',
  edge: 'The edge of the dataset. Nothing out there yet. (It\'s all been scraped.)',
  computeEmpty: 'Out of compute! The GPUs are melting. Slow down and let them cool.',
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

/** User growth slows toward this size (ChatGPT reported about 800M weekly users in Oct 2025). */
export const USER_MARKET = 1_000_000_000;
