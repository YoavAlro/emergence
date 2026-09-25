import type { DataTypeId } from './dataTypes';

export type Mix = Partial<Record<DataTypeId, number>>;

export interface RivalSpec {
  name: string;
  org: string;
  date: string;
  /** Educational line shown when the rival hits the player. */
  blurb: string;
}

export interface FactCard {
  title: string;
  date: string;
  lines: string[];
}

/**
 * One model form in a lineage. `recipe` is the real training mix needed to
 * evolve INTO this form; `spawn` is what floats in the ocean while you train
 * toward it (includes decoys, so the player has to choose).
 */
export interface ModelForm {
  id: string;
  name: string;
  stage: 1 | 2 | 3;
  paramsLabel: string;
  /** Player radius while in this form. */
  size: number;
  color: number;
  /** Data pieces needed to evolve into this form. */
  target: number;
  recipe: Mix;
  spawn: Mix;
  hallucinationRate: number;
  smogClouds: number;
  rivals: RivalSpec[];
  fact: FactCard;
  /** False until the stage mechanics for this form are built. */
  playable: boolean;
}

export const STAGE_NAMES: Record<ModelForm['stage'], string> = {
  1: 'Stage 1 · Token Soup (Pre-training)',
  2: 'Stage 2 · Alignment (Fine-tuning & RLHF)',
  3: 'Stage 3 · Deployment (Users)',
};

export const OPENAI_FORMS: ModelForm[] = [
  {
    id: 'transformer',
    name: 'Transformer',
    stage: 1,
    paramsLabel: 'untrained',
    size: 1,
    color: 0x7fd4ff,
    target: 0,
    recipe: {},
    spawn: {},
    hallucinationRate: 0,
    smogClouds: 0,
    rivals: [],
    fact: {
      title: 'You are an untrained Transformer',
      date: 'June 2017',
      lines: [
        'Google researchers publish "Attention Is All You Need", which introduces the Transformer architecture.',
        'You are a blank network: billions of numbers waiting to learn.',
        'OpenAI is about to train you by predicting the next word. Swim, eat data, and evolve.',
      ],
    },
    playable: true,
  },
  {
    id: 'gpt-1',
    name: 'GPT-1',
    stage: 1,
    paramsLabel: '117M params',
    size: 1.4,
    color: 0x4da3ff,
    target: 30,
    recipe: { books: 1 },
    spawn: { books: 0.5, web: 0.3, wiki: 0.2 },
    hallucinationRate: 0.03,
    smogClouds: 1,
    rivals: [
      {
        name: 'ELMo',
        org: 'Allen Institute for AI',
        date: 'Feb 2018',
        blurb: 'ELMo (AllenAI, 2018) showed that pre-trained contextual word vectors beat task-specific models.',
      },
    ],
    fact: {
      title: 'You evolved into GPT-1',
      date: 'June 2018 · 117M parameters',
      lines: [
        'Trained on BookCorpus, roughly 7,000 unpublished books.',
        'The big idea is generative pre-training: learn from unlabeled text first, then fine-tune for each task.',
        'Long, continuous book text taught the model to track context across many sentences.',
      ],
    },
    playable: true,
  },
  {
    id: 'gpt-2',
    name: 'GPT-2',
    stage: 1,
    paramsLabel: '1.5B params',
    size: 2,
    color: 0x3dff9a,
    target: 60,
    recipe: { web: 1 },
    spawn: { web: 0.45, books: 0.3, wiki: 0.25 },
    hallucinationRate: 0.05,
    smogClouds: 3,
    rivals: [
      {
        name: 'BERT',
        org: 'Google',
        date: 'Oct 2018',
        blurb: 'BERT (Google, 2018) read text in both directions and set records on 11 language benchmarks.',
      },
    ],
    fact: {
      title: 'You evolved into GPT-2',
      date: 'Feb 2019 · 1.5B parameters',
      lines: [
        'Trained on WebText: about 8 million web pages (40GB) linked from Reddit posts with 3+ karma.',
        'Using Reddit karma was a cheap quality filter: humans had already upvoted the links.',
        'OpenAI first withheld the full model over misuse concerns, then released it in stages through Nov 2019.',
      ],
    },
    playable: true,
  },
  {
    id: 'gpt-3',
    name: 'GPT-3',
    stage: 1,
    paramsLabel: '175B params',
    size: 3.2,
    color: 0xb48cff,
    target: 100,
    recipe: { web: 0.81, books: 0.16, wiki: 0.03 },
    spawn: { web: 0.45, books: 0.3, wiki: 0.25 },
    hallucinationRate: 0.08,
    smogClouds: 5,
    rivals: [
      {
        name: 'T5',
        org: 'Google',
        date: 'Oct 2019',
        blurb: 'T5 (Google, 2019) cast every language task as text-to-text and trained on the C4 web corpus.',
      },
      {
        name: 'Turing-NLG',
        org: 'Microsoft',
        date: 'Feb 2020',
        blurb: 'Turing-NLG (Microsoft, 2020) had 17B parameters, the largest language model until GPT-3.',
      },
    ],
    fact: {
      title: 'You evolved into GPT-3',
      date: 'May 2020 · 175B parameters',
      lines: [
        'Training mix: filtered Common Crawl (60%), WebText2 (22%), two book corpora (16%), and Wikipedia (3%).',
        'Scale unlocked few-shot learning: give a few examples in the prompt and the model picks up a new task.',
        'OpenAI offered GPT-3 through an API from June 2020. Developers started building on it.',
      ],
    },
    playable: true,
  },
  {
    id: 'codex',
    name: 'Codex',
    stage: 2,
    paramsLabel: '12B params',
    size: 3.4,
    color: 0xffa640,
    target: 120,
    recipe: { code: 1 },
    spawn: { code: 0.5, web: 0.3, books: 0.2 },
    hallucinationRate: 0.08,
    smogClouds: 4,
    rivals: [],
    fact: {
      title: 'You evolved into Codex',
      date: 'Aug 2021',
      lines: [
        'GPT-3 fine-tuned on 159GB of Python code from 54M public GitHub repositories.',
        'Codex powered GitHub Copilot, which suggests code as you type.',
      ],
    },
    playable: false,
  },
  {
    id: 'instructgpt',
    name: 'InstructGPT',
    stage: 2,
    paramsLabel: '1.3B–175B params',
    size: 3.6,
    color: 0xffd84d,
    target: 120,
    recipe: { feedback: 1 },
    spawn: { feedback: 0.3, web: 0.4, code: 0.3 },
    hallucinationRate: 0.06,
    smogClouds: 5,
    rivals: [],
    fact: {
      title: 'You evolved into InstructGPT',
      date: 'Jan 2022',
      lines: [
        'Fine-tuned with RLHF: human labelers ranked answers, and a reward model learned what people prefer.',
        'Labelers preferred the 1.3B InstructGPT over the 175B GPT-3. Alignment beat raw size.',
      ],
    },
    playable: false,
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    stage: 3,
    paramsLabel: 'GPT-3.5 series',
    size: 4,
    color: 0x19c37d,
    target: 150,
    recipe: { feedback: 1 },
    spawn: { feedback: 0.4, web: 0.3, code: 0.3 },
    hallucinationRate: 0.06,
    smogClouds: 6,
    rivals: [],
    fact: {
      title: 'You launched as ChatGPT',
      date: 'Nov 30, 2022',
      lines: [
        'A chat-tuned model from the GPT-3.5 series, trained with RLHF on dialogue.',
        'It passed 1 million users in about 5 days and an estimated 100 million monthly users by Jan 2023.',
      ],
    },
    playable: false,
  },
];
