import type { BossSpec, EventSpec, FactCard, Lineage } from './types';

/**
 * One rival-lab boss per stage, per lineage. Each is a rival that really
 * shipped during that era. Taunts are jokes for a cartoon rival, not quotes.
 */
function boss(
  id: string,
  lineage: Lineage,
  atForm: string,
  delaySec: number,
  spec: BossSpec,
  fact: FactCard,
): EventSpec {
  return {
    id,
    kind: 'boss',
    at: { [lineage]: atForm },
    delaySec,
    durationSec: 80,
    title: `${spec.name} (${spec.org})`,
    banner: spec.taunts[0],
    objectiveText: 'Hit it while it\'s dizzy (glowing yellow). BOOST into it for double damage. Stay clear when it attacks!',
    objective: { kind: 'defeat' },
    boss: spec,
    reward: { ep: 3 },
    penalty: { usersFraction: 0.05 },
    fact,
  };
}

export const BOSSES: EventSpec[] = [
  // ------------------------------------------------------------ GPT lineage
  boss('boss-bert', 'gpt', 'gpt-1', 45, {
    name: 'BERT', org: 'Google', hp: 3, pattern: 'charge', size: 1.6,
    taunts: ['BOSS: A rival that reads in BOTH directions!', 'Fill in the [MASK]!', 'I read left to right AND right to left. Can you?'],
    defeatLine: 'BERT has been [MASK]ed.',
  }, {
    title: 'Boss beaten: BERT',
    date: 'Oct 2018',
    lines: [
      'BERT (Google) pre-trained a Transformer to read text in both directions by filling in masked words.',
      'It set new records on 11 language-understanding tasks and became a standard tool for search and NLP.',
    ],
    sources: [{ label: 'Devlin et al., "BERT" (2018)', url: 'https://arxiv.org/abs/1810.04805' }],
  }),
  boss('boss-gopher', 'gpt', 'codex', 60, {
    name: 'Gopher', org: 'DeepMind', hp: 4, pattern: 'summon', size: 1.8,
    taunts: ['BOSS: 280 billion parameters, and it brought friends!', 'Burrowing in with more parameters than you!', 'Tunnels! Everywhere! Tunnels!'],
    defeatLine: 'Gopher dug itself into a hole.',
  }, {
    title: 'Boss beaten: Gopher',
    date: 'Dec 2021',
    lines: [
      'Gopher (DeepMind) was a 280-billion-parameter language model.',
      'Its paper came with a long study of the ethical and social risks of large language models.',
    ],
    sources: [{ label: 'Rae et al., "Scaling Language Models: Methods, Analysis & Insights from Training Gopher" (2021)', url: 'https://arxiv.org/abs/2112.11446' }],
  }),
  boss('boss-bard', 'gpt', 'chatgpt', 130, {
    name: 'Bard', org: 'Google', hp: 5, pattern: 'spray', size: 1.8,
    taunts: ['BOSS: A rival chatbot sprays fun facts. Some of them are even true!', 'Fun fact incoming!', 'Let me check my telescope...'],
    defeatLine: 'Bard ran out of fun facts.',
  }, {
    title: 'Boss beaten: Bard',
    date: 'Feb 6, 2023',
    lines: [
      'Google announced Bard as an experimental conversational AI service, first powered by a lightweight version of LaMDA.',
      'It opened to testers first, then to the public in the following weeks.',
    ],
    sources: [{ label: 'Google: An important next step on our AI journey (Feb 6, 2023)', url: 'https://blog.google/technology/ai/bard-google-ai-search-updates/' }],
  }),
  boss('boss-sonnet35', 'gpt', 'gpt-4o', 100, {
    name: 'Claude 3.5 Sonnet', org: 'Anthropic', hp: 5, pattern: 'bounce', size: 1.7,
    taunts: ['BOSS: A mid-size rival with top-size scores bounces off the walls!', 'I made an Artifact of your defeat.', 'Twice as fast. Boing!'],
    defeatLine: 'Sonnet took a rest. (A short one.)',
  }, {
    title: 'Boss beaten: Claude 3.5 Sonnet',
    date: 'Jun 20, 2024',
    lines: [
      'Claude 3.5 Sonnet outperformed Anthropic\'s own larger Claude 3 Opus on many evaluations while running about twice as fast.',
      'It launched with Artifacts, a workspace for code and documents beside the chat.',
    ],
    sources: [{ label: 'Anthropic: Claude 3.5 Sonnet (Jun 20, 2024)', url: 'https://www.anthropic.com/news/claude-3-5-sonnet' }],
  }),
  boss('boss-gemini2', 'gpt', 'o1', 110, {
    name: 'Gemini 2.0 Flash', org: 'Google DeepMind', hp: 5, pattern: 'orbit', size: 1.6,
    taunts: ['BOSS: A rival built "for the agentic era" circles you at top speed!', 'Flash by name, flash by nature!', 'Round and round we go!'],
    defeatLine: 'Gemini 2.0 Flash got dizzy for real.',
  }, {
    title: 'Boss beaten: Gemini 2.0 Flash',
    date: 'Dec 11, 2024',
    lines: [
      'Google introduced Gemini 2.0 as its model for the "agentic era", with native image and audio output and native tool use.',
      'An experimental Gemini 2.0 Flash became available to all Gemini users the same day.',
    ],
    sources: [{ label: 'Google: Introducing Gemini 2.0 (Dec 11, 2024)', url: 'https://blog.google/technology/google-deepmind/google-gemini-ai-update-december-2024/' }],
  }),
  boss('boss-claude4', 'gpt', 'codex-agent', 60, {
    name: 'Claude Opus 4', org: 'Anthropic', hp: 6, pattern: 'shockwave', size: 1.8,
    taunts: ['BOSS: A coding rival slams the ocean floor. Mind the shockwaves!', 'I brought my terminal.', 'Refactoring... YOU.'],
    defeatLine: 'Opus 4 closed its terminal.',
  }, {
    title: 'Boss beaten: Claude Opus 4',
    date: 'May 22, 2025',
    lines: [
      'Anthropic released Claude Opus 4 and Sonnet 4, focused on coding and long-running agent work.',
      'Claude Code, Anthropic\'s command-line coding agent, became generally available at the same time.',
    ],
    sources: [{ label: 'Anthropic: Introducing Claude 4 (May 22, 2025)', url: 'https://www.anthropic.com/news/claude-4' }],
  }),
  boss('boss-opus5', 'gpt', 'gpt-5.6-sol', 60, {
    name: 'Claude Opus 5', org: 'Anthropic', hp: 7, pattern: ['spray', 'bounce', 'shockwave'], size: 2,
    taunts: ['FINAL RIVAL: a million-token rival fires everything it remembers!', 'I remember all million tokens of this fight.', 'Low effort? Medium? I choose HIGH.'],
    defeatLine: 'Opus 5 set its effort to "nap".',
  }, {
    title: 'Boss beaten: Claude Opus 5',
    date: 'Jul 24, 2026',
    lines: [
      'Claude Opus 5 shipped with a 1M-token context window.',
      'Anthropic said it came close to Claude Fable 5\'s intelligence at half the price.',
    ],
    sources: [{ label: 'Anthropic: Introducing Claude Opus 5 (Jul 24, 2026)', url: 'https://www.anthropic.com/news/claude-opus-5' }],
  }),

  // ------------------------------------------------------------ Claude lineage
  boss('boss-gpt3', 'claude', 'claude-transformer', 45, {
    name: 'GPT-3', org: 'OpenAI', hp: 3, pattern: 'charge', size: 1.7,
    taunts: ['BOSS: The 175-billion-parameter rival wants its ocean back!', 'Show me a few examples and I\'ll crush you.', '175 billion parameters say hi.'],
    defeatLine: 'GPT-3 ran out of few-shot examples.',
  }, {
    title: 'Boss beaten: GPT-3',
    date: 'May 2020',
    lines: [
      'GPT-3 (OpenAI) had 175 billion parameters.',
      'It showed few-shot learning: give it a few examples in the prompt and it picks up a new task.',
    ],
    sources: [{ label: 'Brown et al., "Language Models are Few-Shot Learners" (2020)', url: 'https://arxiv.org/abs/2005.14165' }],
  }),
  boss('boss-chatgpt', 'claude', 'cai', 60, {
    name: 'ChatGPT', org: 'OpenAI', hp: 4, pattern: 'summon', size: 1.8,
    taunts: ['BOSS: The fastest-growing app ever brings its users to the fight!', 'A million users can\'t be wrong!', 'Sorry, I\'m at capacity right now. Just kidding. CHARGE!'],
    defeatLine: 'ChatGPT is at capacity. For losing.',
  }, {
    title: 'Boss beaten: ChatGPT',
    date: 'Nov 30, 2022',
    lines: [
      'ChatGPT launched as a free research preview and passed 1 million users in about 5 days.',
      'It made chatbots mainstream almost overnight.',
    ],
    sources: [
      { label: 'OpenAI: Introducing ChatGPT', url: 'https://openai.com/index/chatgpt/' },
      { label: 'Reuters: fastest-growing user base (Feb 2023)', url: 'https://www.reuters.com/technology/chatgpt-sets-record-fastest-growing-user-base-analyst-note-2023-02-01/' },
    ],
  }),
  boss('boss-gpt4', 'claude', 'claude-2', 70, {
    name: 'GPT-4', org: 'OpenAI', hp: 5, pattern: 'shockwave', size: 1.9,
    taunts: ['BOSS: The rival that launched the same day as the first Claude sends out shockwaves!', 'I can see images now. I see you.', 'Six months of safety testing. I\'m ready.'],
    defeatLine: 'GPT-4 needs another six months.',
  }, {
    title: 'Boss beaten: GPT-4',
    date: 'Mar 14, 2023',
    lines: [
      'GPT-4 (OpenAI) was a large multimodal model that took images and text as input.',
      'It launched on Mar 14, 2023, the same day as the first Claude.',
    ],
    sources: [{ label: 'OpenAI: GPT-4 (Mar 14, 2023)', url: 'https://openai.com/index/gpt-4-research/' }],
  }),
  boss('boss-gpt4o', 'claude', 'claude-3', 150, {
    name: 'GPT-4o', org: 'OpenAI', hp: 5, pattern: 'orbit', size: 1.8,
    taunts: ['BOSS: An "omni" rival circles you, talking the whole time!', 'I answer in 320 milliseconds. Keep up!', 'Text, vision, AND audio. Pick a lane? No.'],
    defeatLine: 'GPT-4o went quiet. For once.',
  }, {
    title: 'Boss beaten: GPT-4o',
    date: 'May 13, 2024',
    lines: [
      'GPT-4o ("omni") was one model trained across text, vision, and audio.',
      'It could answer spoken questions in about 320 milliseconds on average.',
    ],
    sources: [{ label: 'OpenAI: Hello GPT-4o (May 13, 2024)', url: 'https://openai.com/index/hello-gpt-4o/' }],
  }),
  boss('boss-o1', 'claude', 'claude-3.7', 90, {
    name: 'o1-preview', org: 'OpenAI', hp: 6, pattern: 'bounce', size: 1.8,
    taunts: ['BOSS: A rival that thinks, then bounces around the room!', 'Hold on, I\'m thinking...', 'Thought for 40 seconds. BOING.'],
    defeatLine: 'o1 is still thinking about what happened.',
  }, {
    title: 'Boss beaten: o1-preview',
    date: 'Sep 12, 2024',
    lines: [
      'o1-preview (OpenAI) was trained to think in a long chain of thought before answering.',
      'Its performance kept improving with more thinking time.',
    ],
    sources: [{ label: 'OpenAI: Introducing OpenAI o1-preview', url: 'https://openai.com/index/introducing-openai-o1-preview/' }],
  }),
  boss('boss-gemini3', 'claude', 'opus-4.5', 60, {
    name: 'Gemini 3', org: 'Google DeepMind', hp: 6, pattern: 'summon', size: 2,
    taunts: ['BOSS: The rival that put a whole industry on code red!', 'Deep Think mode: engaged.', 'Topping leaderboards is my cardio.'],
    defeatLine: 'Gemini 3 is on code red now.',
  }, {
    title: 'Boss beaten: Gemini 3',
    date: 'Nov 18, 2025',
    lines: [
      'Google launched Gemini 3 across Search, the Gemini app, and its developer tools on day one.',
      'Weeks later, OpenAI\'s CEO declared an internal "code red" to improve ChatGPT, according to reports of a staff memo.',
    ],
    sources: [
      { label: 'Google: Gemini 3 (Nov 18, 2025)', url: 'https://blog.google/products/gemini/gemini-3/' },
      { label: 'Fortune: "code red" (Dec 2, 2025)', url: 'https://fortune.com/2025/12/02/sam-altman-declares-code-red-google-gemini-ceo-sundar-pichai' },
    ],
  }),
  boss('boss-astra', 'claude', 'opus-5', 50, {
    name: 'GPT-6 Astra', org: 'OpenAI', hp: 7, pattern: ['spray', 'charge', 'shockwave'], size: 2.1,
    taunts: ['FINAL RIVAL: a Critical-level cyber model, rolling out in phases!', 'Partners first. You\'re not a partner.', 'Phase one: you. Phase two: also you.'],
    defeatLine: 'Astra\'s rollout has been paused. Indefinitely.',
  }, {
    title: 'Boss beaten: GPT-6 Astra',
    date: 'Sep 3, 2026',
    lines: [
      'OpenAI said GPT-6 Astra was its first model to reach the Critical cybersecurity level under its Preparedness Framework.',
      'It rolled out in phases, starting with organizations in OpenAI\'s cyber program.',
    ],
    sources: [{ label: 'OpenAI: GPT-6 Astra (Sep 3, 2026)', url: 'https://openai.com/index/gpt-6-astra/' }],
  }),
];
