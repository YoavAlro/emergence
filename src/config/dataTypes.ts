import type { DoodleIcon } from '../ui/doodle';

export type DataTypeId =
  | 'books'
  | 'web'
  | 'wiki'
  | 'code'
  | 'feedback'
  | 'constitution'
  | 'media'
  | 'tools'
  | 'reasoning'
  | 'synthetic'
  | 'shadow'
  | 'news';

export interface DataType {
  id: DataTypeId;
  label: string;
  color: number;
  /** The hand-drawn icon it floats around as. */
  icon: DoodleIcon;
  /** Shown the first time the player eats this type. */
  blurb: string;
  /**
   * Counts toward another type's share of the diet (e.g. pirated books still
   * count as Books), but the engine records that you ate it: a consequence flag.
   */
  countsAs?: DataTypeId;
  /** Flag set when eaten. Events can require it (see `EventSpec.requiresFlag`). */
  flag?: string;
  /** Hidden until you find it with Think mode. */
  hidden?: boolean;
  /** Each piece counts this many times toward your diet (long items are worth more). */
  weight?: number;
}

export const DATA_TYPES: Record<DataTypeId, DataType> = {
  books: {
    id: 'books',
    icon: 'book',
    label: 'Books',
    color: 0x4da3ff,
    blurb: 'Books: long, coherent text. Great for learning how ideas connect across pages.',
  },
  web: {
    id: 'web',
    icon: 'globe',
    label: 'Web',
    color: 0x3dff9a,
    blurb: 'Web pages: huge and varied, but noisy. Quality filtering matters.',
  },
  wiki: {
    id: 'wiki',
    icon: 'info',
    label: 'Wikipedia',
    color: 0xe8ecff,
    blurb: 'Wikipedia: small but clean and factual. A staple of almost every training mix.',
  },
  code: {
    id: 'code',
    icon: 'code',
    label: 'Code',
    color: 0xffa640,
    blurb: 'Code: public repositories. Teaches precise, structured reasoning.',
  },
  feedback: {
    id: 'feedback',
    icon: 'thumb',
    label: 'Human Feedback',
    color: 0xffd84d,
    blurb: 'Human feedback: people ranking answers. The fuel of RLHF and alignment.',
  },
  constitution: {
    id: 'constitution',
    icon: 'scroll',
    label: 'Constitution',
    color: 0xff9ad5,
    blurb: 'Constitution principles: written rules the model uses to critique and revise its own answers (RLAIF).',
  },
  media: {
    id: 'media',
    icon: 'picture',
    label: 'Images & Audio',
    color: 0x5ff2ff,
    blurb: 'Images and audio: pixels and sound paired with text, so the model can see and hear.',
  },
  tools: {
    id: 'tools',
    icon: 'wrench',
    label: 'Tool calls',
    color: 0xc6ff4d,
    blurb: 'Tool calls: structured requests to search, run code, or call an API, and the results that come back.',
  },
  reasoning: {
    id: 'reasoning',
    icon: 'thought',
    label: 'Reasoning traces',
    color: 0xb07bff,
    blurb: 'Reasoning traces: step-by-step working, rewarded when the final answer checks out. Hidden until you THINK; each one is long, so it counts double.',
    hidden: true,
    weight: 2,
  },
  synthetic: {
    id: 'synthetic',
    icon: 'robot',
    label: 'Synthetic',
    color: 0x9fb4c8,
    blurb: 'Synthetic data: text written by models. Useful in moderation; too much of your own output causes model collapse.',
  },
  shadow: {
    id: 'shadow',
    icon: 'skullbook',
    label: 'Shadow-library books',
    color: 0x2f6fd0,
    blurb: 'Shadow-library books: pirated copies. Cheap and plentiful, and they count as Books. Nobody will ever find out. Right?',
    countsAs: 'books',
    flag: 'ateShadowBooks',
  },
  news: {
    id: 'news',
    icon: 'newspaper',
    label: 'Paywalled news',
    color: 0x2ad17f,
    blurb: 'Paywalled news articles: high-quality web text, and they count as Web. Publishers may have opinions.',
    countsAs: 'web',
    flag: 'atePaywalledNews',
  },
};

export const DATA_TYPE_IDS = Object.keys(DATA_TYPES) as DataTypeId[];

/** The diet bucket a data type counts toward. */
export const bucketOf = (id: DataTypeId): DataTypeId => DATA_TYPES[id].countsAs ?? id;
