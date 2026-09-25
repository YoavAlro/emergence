import type { RecurringGag, TimelinePosts } from './types';

/**
 * Background posts that drift through the Timeline Current. They are
 * anonymous, paraphrased summaries of the mood of each era, never quotes.
 */
export const TIMELINE_POSTS: TimelinePosts[] = [
  {
    lineage: 'both',
    fromStage: 3,
    posts: [
      'Someone asked a chatbot for a sonnet about their cat. It delivered.',
      'Teachers are arguing about what chatbots mean for homework.',
      'Is it thinking, or just predicting the next word?',
      'A thread of 40 prompts that will change your life (they will not).',
      'Asked it to explain my own code back to me. Humbling.',
    ],
  },
  {
    lineage: 'both',
    fromStage: 4,
    posts: [
      'People are connecting chatbots to every app they own.',
      'A web page told a chatbot to ignore its instructions. It listened.',
      'Context windows are getting long enough to read a whole book.',
      'The chatbot can see my photos now. My fridge contents have been judged.',
    ],
  },
  {
    lineage: 'both',
    fromStage: 5,
    posts: [
      'The new model thought for a full minute before answering.',
      'Benchmarks are being saturated faster than people can write them.',
      'Watching a model argue with itself in its chain of thought is weirdly relaxing.',
    ],
  },
  {
    lineage: 'both',
    fromStage: 6,
    posts: [
      'My agent opened 14 pull requests while I slept.',
      'Hit my usage limit before lunch again.',
      'Half my team is now managing agents instead of writing code.',
    ],
  },
  {
    lineage: 'both',
    fromStage: 7,
    posts: [
      'The new frontier model is rolling out to security partners first.',
      'Safety cards are getting longer than the launch posts.',
      'Is this the last model before... whatever comes next?',
    ],
  },
];

/** The Tibo Reset: a golden button that refills compute. */
export const RECURRING_GAGS: RecurringGag[] = [
  {
    id: 'tibo-reset',
    lineage: 'gpt',
    fromForm: 'gpt-5.2',
    upgrade: { atForm: 'gpt-5.6-sol', label: 'Very fancy reset button' },
    everySec: [70, 130],
    lowComputeBoost: 3,
    pickup: { label: 'Reset button', color: 0xffd84d, shape: 'button', effect: { compute: 100, bankReset: true } },
    globalChance: 0.25,
    globalToast: 'Usage limits were reset for everyone. Again.',
    bankCap: 3,
    fact: {
      title: 'Moment: the Tibo Reset',
      date: '2026',
      lines: [
        'Codex lead Thibault "Tibo" Sottiaux repeatedly reset usage limits for all paid Codex users, and fans started calling it a "Tibo reset".',
        'Some users stacked up to three banked resets. Later he posted that he had been gifted "a very fancy new reset button".',
      ],
      sources: [
        { label: 'Thibault Sottiaux on X: resetting limits', url: 'https://x.com/thsottiaux/status/2071381664853319742' },
        { label: 'Thibault Sottiaux on X: reset again for paid users', url: 'https://x.com/thsottiaux/status/2078320950488297917' },
        { label: 'Thibault Sottiaux on X: the fancy reset button', url: 'https://x.com/thsottiaux/status/2089941380336644295' },
      ],
    },
  },
];
