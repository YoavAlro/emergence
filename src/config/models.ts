import { CLAUDE_FORMS } from './claudeForms';
import { GPT_FORMS } from './gptForms';
import type { Lineage, ModelForm, Stage } from './types';

export type { FactCard, Mix, ModelForm, RivalSpec } from './types';

export const STAGE_NAMES: Record<Stage, string> = {
  1: 'Stage 1 · Token Soup (Pre-training)',
  2: 'Stage 2 · Alignment',
  3: 'Stage 3 · Viral Launch',
  4: 'Stage 4 · Tools & Internet',
  5: 'Stage 5 · Reasoning',
  6: 'Stage 6 · The Swarm',
  7: 'Stage 7 · Frontier',
};

export interface LineageInfo {
  id: Lineage;
  name: string;
  lab: string;
  blurb: string;
  forms: ModelForm[];
}

export const LINEAGES: Record<Lineage, LineageInfo> = {
  gpt: {
    id: 'gpt',
    name: 'GPT lineage',
    lab: 'OpenAI',
    blurb: 'From the Transformer (2017) to GPT-6 Astra (Sep 2026)',
    forms: GPT_FORMS,
  },
  claude: {
    id: 'claude',
    name: 'Claude lineage',
    lab: 'Anthropic',
    blurb: 'From a 2021 research model to Claude Opus 5.5 (Sep 2026)',
    forms: CLAUDE_FORMS,
  },
};
