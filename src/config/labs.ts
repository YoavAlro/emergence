/**
 * Labs get original, hand-drawn emblems. They are deliberately NOT based on any
 * real logo (no knots, asterisks, infinity loops, whales, letters, or grids):
 * each is a playful doodle of a pun or theme, in a color loosely tied to the lab.
 */
export type EmblemIcon =
  | 'rocket'
  | 'lighthouse'
  | 'telescope'
  | 'owl'
  | 'llama'
  | 'bolt'
  | 'compass'
  | 'submarine'
  | 'moon'
  | 'book'
  | 'column'
  | 'dice'
  | 'gear'
  | 'kite';

export interface LabSpec {
  id: string;
  /** Names that appear as `RivalSpec.org`. */
  names: string[];
  color: number;
  icon: EmblemIcon;
  /** Why the doodle: a small joke, shown nowhere important. */
  pun: string;
}

export const LABS: LabSpec[] = [
  { id: 'openai', names: ['OpenAI'], color: 0x19c37d, icon: 'rocket', pun: 'Always launching something.' },
  { id: 'anthropic', names: ['Anthropic'], color: 0xe07a4f, icon: 'lighthouse', pun: 'A safety beacon.' },
  { id: 'google', names: ['Google'], color: 0x4d8bff, icon: 'telescope', pun: 'Remember the telescope demo?' },
  { id: 'deepmind', names: ['DeepMind', 'Google DeepMind'], color: 0x6f7bff, icon: 'owl', pun: 'Plays a very long game.' },
  { id: 'meta', names: ['Meta'], color: 0x3fa9ff, icon: 'llama', pun: 'LLaMA, obviously.' },
  { id: 'xai', names: ['xAI'], color: 0xb0b8c8, icon: 'bolt', pun: 'Fast, loud, and on the timeline.' },
  { id: 'microsoft', names: ['Microsoft'], color: 0x2fb5e0, icon: 'compass', pun: 'Knows which way to Bing.' },
  { id: 'deepseek', names: ['DeepSeek'], color: 0x4d6bff, icon: 'submarine', pun: 'Seeking the deep, on a budget.' },
  { id: 'moonshot', names: ['Moonshot AI'], color: 0xc9c2ff, icon: 'moon', pun: 'Right there in the name.' },
  { id: 'allenai', names: ['Allen Institute for AI'], color: 0xf2c14e, icon: 'book', pun: 'Reads everything first.' },
  { id: 'eleuther', names: ['EleutherAI'], color: 0xd9d2c3, icon: 'column', pun: 'Open, and a little classical.' },
  { id: 'ai21', names: ['AI21 Labs'], color: 0xff6fb1, icon: 'dice', pun: 'Rolled a 21.' },
  { id: 'cognition', names: ['Cognition'], color: 0x9aa3b5, icon: 'gear', pun: 'Engineering, allegedly.' },
];

const FALLBACK: LabSpec = { id: 'other', names: [], color: 0xff5c8a, icon: 'kite', pun: 'A lab of mystery.' };

export function labFor(org: string): LabSpec {
  return LABS.find((l) => l.names.includes(org)) ?? FALLBACK;
}

/** The player's own lab, per lineage. */
export const LINEAGE_LAB: Record<'gpt' | 'claude', string> = { gpt: 'OpenAI', claude: 'Anthropic' };
