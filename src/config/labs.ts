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

/**
 * How each lineage's hero is drawn. Inspired by each company's colors and product style,
 * with an original crest; deliberately not a copy of any logo.
 */
export interface HeroStyle {
  /** Main body color. */
  body: string;
  /** Tummy patch. */
  belly: string;
  cheeks: string;
  /** Crest and trim color. */
  accent: string;
  /** Crest drawn on the head from Stage 2 on. */
  crest: 'spark' | 'loop';
  /** A few words shown in the editor and title. */
  personality: string;
}

export const HERO_STYLE: Record<'gpt' | 'claude', HeroStyle> = {
  // Clean monochrome with a bright green accent.
  gpt: { body: '#f7f7f4', belly: '#e3e3dc', cheeks: '#9fe3cc', accent: '#10a37f', crest: 'loop', personality: 'Fast, curious, always shipping' },
  // Warm terracotta and cream.
  claude: { body: '#d97757', belly: '#f6e8d8', cheeks: '#f3a78c', accent: '#fbf3e8', crest: 'spark', personality: 'Thoughtful, careful, a bit bookish' },
};
