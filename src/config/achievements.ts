/** Achievements (lifetime, across runs) and the cosmetic skins they unlock. */

export type StatKey =
  | 'eaten'
  | 'maxCombo'
  | 'bestScore'
  | 'bosses'
  | 'hypeRight'
  | 'stormsSurvived'
  | 'momentsWon'
  | 'resetsUsed'
  | 'forks'
  | 'roguesFixed'
  | 'hallucinations'
  | 'evolutions'
  | 'perfectDiets'
  | 'internetTrips'
  | 'thinkSeconds'
  | 'currentSeconds'
  | 'partsBought'
  | 'scandals'
  | 'overRefusals'
  | 'finishedGpt'
  | 'finishedClaude';

export interface AchievementSpec {
  id: string;
  name: string;
  desc: string;
  stat: StatKey;
  atLeast: number;
}

export const ACHIEVEMENTS: AchievementSpec[] = [
  { id: 'tokenized', name: 'Tokenized', desc: 'Eat your first piece of data.', stat: 'eaten', atLeast: 1 },
  { id: 'library', name: 'Ate a Library', desc: 'Eat 500 pieces of data.', stat: 'eaten', atLeast: 500 },
  { id: 'internet', name: 'Ate the Whole Internet', desc: 'Eat 5,000 pieces of data. Burp.', stat: 'eaten', atLeast: 5000 },
  { id: 'autocomplete', name: 'Autocomplete', desc: 'Reach a 10× eating combo.', stat: 'maxCombo', atLeast: 10 },
  { id: 'frenzy', name: 'Next-Token Frenzy', desc: 'Reach a 30× combo.', stat: 'maxCombo', atLeast: 30 },
  { id: 'overflow', name: 'Context Window Overflow', desc: 'Reach a 75× combo.', stat: 'maxCombo', atLeast: 75 },
  { id: 'benchmark', name: 'Benchmark Topper', desc: 'Score 25,000 points in one run.', stat: 'bestScore', atLeast: 25_000 },
  { id: 'leaderboard', name: 'Leaderboard Legend', desc: 'Score 150,000 points in one run.', stat: 'bestScore', atLeast: 150_000 },
  { id: 'rattled', name: 'Rival Rattled', desc: 'Beat your first boss.', stat: 'bosses', atLeast: 1 },
  { id: 'brawler', name: 'Frontier Brawler', desc: 'Beat 7 bosses.', stat: 'bosses', atLeast: 7 },
  { id: 'undisputed', name: 'Undisputed', desc: 'Beat all 14 bosses across both lineages.', stat: 'bosses', atLeast: 14 },
  { id: 'detector', name: 'Hype Detector', desc: 'Call 5 hype waves right.', stat: 'hypeRight', atLeast: 5 },
  { id: 'oracle', name: 'Oracle of the Timeline', desc: 'Call 15 hype waves right.', stat: 'hypeRight', atLeast: 15 },
  { id: 'chaser', name: 'Storm Chaser', desc: 'Survive 5 storms.', stat: 'stormsSurvived', atLeast: 5 },
  { id: 'weathered', name: 'Weathered Everything', desc: 'Survive 20 storms.', stat: 'stormsSurvived', atLeast: 20 },
  { id: 'historian', name: 'Meme Historian', desc: 'Win 8 moments.', stat: 'momentsWon', atLeast: 8 },
  { id: 'resetting', name: 'Have You Tried Resetting It?', desc: 'Use 3 banked resets.', stat: 'resetsUsed', atLeast: 3 },
  { id: 'management', name: 'Middle Management', desc: 'Fork 15 sub-agents.', stat: 'forks', atLeast: 15 },
  { id: 'wrangler', name: 'Agent Wrangler', desc: 'Reset 5 rogue forks.', stat: 'roguesFixed', atLeast: 5 },
  { id: 'confident', name: 'Confidently Wrong', desc: 'Eat 25 hallucinations. On purpose? Surely not.', stat: 'hallucinations', atLeast: 25 },
  { id: 'versions', name: 'Version Creep', desc: 'Evolve 15 times.', stat: 'evolutions', atLeast: 15 },
  { id: 'by-the-book', name: 'By the Book', desc: 'Match a real diet at 90%+ five times.', stat: 'perfectDiets', atLeast: 5 },
  { id: 'surfer', name: 'Frequent Surfer', desc: 'Swim into the live internet 5 times.', stat: 'internetTrips', atLeast: 5 },
  { id: 'deep-thought', name: 'Deep Thought', desc: 'Spend 2 minutes thinking.', stat: 'thinkSeconds', atLeast: 120 },
  { id: 'very-online', name: 'Very Online', desc: 'Ride the Timeline Current for 3 minutes.', stat: 'currentSeconds', atLeast: 180 },
  { id: 'accessorized', name: 'Fully Accessorized', desc: 'Buy 8 creature parts.', stat: 'partsBought', atLeast: 8 },
  { id: 'pr-nightmare', name: 'PR Nightmare', desc: 'Cause a toxic-output scandal. Oops.', stat: 'scandals', atLeast: 1 },
  { id: 'cant-eat-that', name: 'I\'m Afraid I Can\'t Eat That', desc: 'Over-refuse 10 harmless requests.', stat: 'overRefusals', atLeast: 10 },
  { id: 'astra', name: 'Astra-nomical', desc: 'Finish the GPT lineage.', stat: 'finishedGpt', atLeast: 1 },
  { id: 'opus', name: 'Magnum Opus', desc: 'Finish the Claude lineage.', stat: 'finishedClaude', atLeast: 1 },
];

export type Accessory = 'none' | 'partyHat' | 'shades' | 'bowtie' | 'crown' | 'halo';

export interface SkinSpec {
  id: string;
  name: string;
  /** Overrides the form color. */
  color?: number;
  accessory: Accessory;
  /** Achievement that unlocks it; null = always available. */
  unlock: string | null;
}

export const SKINS: SkinSpec[] = [
  { id: 'classic', name: 'Classic', accessory: 'none', unlock: null },
  { id: 'party', name: 'Launch Party', accessory: 'partyHat', unlock: 'frenzy' },
  { id: 'cool', name: 'Too Cool for Hype', accessory: 'shades', unlock: 'detector' },
  { id: 'manager', name: 'Agent Manager', accessory: 'bowtie', unlock: 'management' },
  { id: 'golden', name: 'Golden Weights', color: 0xffd84d, accessory: 'crown', unlock: 'rattled' },
  { id: 'aligned', name: 'Perfectly Aligned', color: 0xfff1d6, accessory: 'halo', unlock: 'by-the-book' },
];
