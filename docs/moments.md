# Moments: the funny side of AI history

Moments are short, comedic, playable gags pinned to real (and very memeable) events. They are
lighter than [Storms](events.md#storms-30-90-s-dangers), with lower stakes and bigger laughs, but each
one still ends with a fact card that teaches something real.

Legend: ✅ well-established · ✅² recent, verified against the primary source in the fact card
(Sep 2026 fact pass). Lineage: **G** = GPT, **C** = Claude, **R** = rival cameo. Nothing marked 🔎 ships.
Shipped content: `src/config/moments.ts`, `src/config/claudeEvents.ts`, `src/config/timeline.ts`.

## Tone rules

- **Laugh at situations, not people.** A real person may be named only for something they publicly
  did (e.g. "Codex lead Tibo reset everyone's usage limits").
- **No invented quotes.** In-game posts are anonymous paraphrases. Real quotes appear only in fact
  cards, with a source link.
- Affectionate roast, not dunking. If it would embarrass someone rather than amuse them, cut it.

## OpenAI moments

| Moment | When | Era (current form) | The gag in-game | | |
|---|---|---|---|---|---|
| Screenshots everywhere | Dec 2022 | ChatGPT | Grab viral screenshots in the surging Current | G | ✅ |
| **The Em Dash Habit** | 2023–Nov 2025 | ChatGPT → GPT-5 | You leave a trail of "—"; −10% users until a *style guide* orb appears in the GPT-5 era | G | ✅ |
| Winter Laziness | Dec 2023 | GPT-4 Turbo | Half speed and "finish it yourself" bubbles; eat 10 anyway | G | ✅ |
| **How many R's in strawberry?** | 2024 | GPT-4o, then o1 | You see tokens (str·aw·berry) and answer 2; later you spell it out and count 3 | G | ✅ |
| **The Naming Maze** | Dec 2024–Apr 2025 | Operator | Tap models in release order; o2 never existed | G | ✅ |
| **The Glazing** | Apr 2025 | Operator | Compliment orbs win users but drain Alignment; a rollback undoes your newest part | G | ✅ |
| **Chart Crime** | Aug 2025 | GPT-5 | Tap the bar drawn wrong (o3's 69.1% drawn like 30.8%) | G | ✅ |
| **#keep4o** | Aug 2025 | GPT-5 | Catch the ghost of GPT-4o to win users back | G | ✅ |
| **Cameo Flood** | Sep 30–Oct 2025 | GPT-5 | Pop look-alike video copies of you | G | ✅ |
| **Code Red** | Dec 2025 | GPT-5 | Red lighting, editor locked, sprint to eat 25 | G | ✅² |
| **The Tibo Reset** | 2026 | GPT-5.2 onward (recurring) | A golden RESET button drifts in the Current, more often when compute is low. Grab it to refill compute and bank a reset (max 3, X/RESET to use). Sometimes it fires for everyone. From GPT-5.6 it's a *very fancy* reset button | G | ✅² |

## Claude moments

| Moment | When | Era | The gag in-game | | |
|---|---|---|---|---|---|
| **Golden Gate Claude** | May 2024 | Claude 3 | Every particle becomes a bridge and you steer yourself toward it; keep eating | C | ✅ |
| **Claude Plays Pokémon** | Feb 2025 | Claude 3.7 Sonnet | A cave maze; THINK shows the next steps of the path | C | ✅ |
| The fair-use ruling | Jun 2025 | Claude 4 | A short card on the Bartz ruling | C | ✅ |
| **Project Vend** | Jun 2025 | Claude 4 | Run a tiny shop for five persuasive customers; don't go broke | C | ✅ |
| The holiday build spree | Dec 2025–Jan 2026 | Opus 4.5 | Current surge from Claude Code screenshots | C | ✅² |
| Project Glasswing | Apr 2026 | Mythos Preview | Stay near defender partner hubs to build Trust | C | ✅² |

## Rival cameos

| Moment | When | The gag | | |
|---|---|---|---|---|
| **The telescope slip** | Feb 2023 | Bard stumbles after a factual error in its demo; grab the users it drops | R | ✅ |
| A rival pauses its image generator | Feb 2024 | Gemini stumbles (Claude path) | R | ✅ |
| **Glue on pizza** | May 2024 | AI Overviews stumbles; grab the users it drops | R | ✅ |

## Wiring

- Moments reuse the event system (`kind: 'moment'`). Mini-games (Strawberry, the Naming Maze, Chart
  Crime, Claude Plays Pokémon, Project Vend) are DOM overlays that work with touch and keyboard.
- Two gags recur instead of firing once: the Tibo Reset (`RECURRING_GAGS`, weighted toward low compute)
  and the Em Dash trail (a `lingering` debuff until the style-guide orb cures it).

## Sources for quotes and the ✅² rows

- Tibo resets: [post: resetting limits](https://x.com/thsottiaux/status/2071381664853319742) ·
  [post: reset again](https://x.com/thsottiaux/status/2078320950488297917) ·
  [post: "a very fancy new reset button"](https://x.com/thsottiaux/status/2089941380336644295)
- Chart crime: [TechCrunch](https://techcrunch.com/2025/08/08/sam-altman-addresses-bumpy-gpt-5-rollout-bringing-4o-back-and-the-chart-crime/) · [post](https://x.com/sama/status/1953513280594751495)
- Em dash: [TechCrunch](https://techcrunch.com/2025/11/14/openai-says-its-fixed-chatgpts-em-dash-problem/) · [post](https://x.com/sama/status/1989193813043069219)
- GPUs melting: [post](https://x.com/sama/status/1905296867145154688) · [Fortune](https://fortune.com/2025/03/28/sam-altman-chatgpt-gpus-melting-ai-images/)
- Code red: [Fortune](https://fortune.com/2025/12/02/sam-altman-declares-code-red-google-gemini-ceo-sundar-pichai) · [Forbes](https://www.forbes.com/sites/siladityaray/2025/12/02/altman-code-red-memo-urges-chatgpt-improvements-amid-growing-threat-from-google-reports-say/)
- Claude Code holidays: [Wikipedia](https://en.wikipedia.org/wiki/Claude_(language_model)) · [Zvi Mowshowitz](https://thezvi.wordpress.com/2026/01/09/claude-codes/)
