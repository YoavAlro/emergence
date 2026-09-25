# Moments: the funny side of AI history

Moments are short, comedic, playable gags pinned to real (and very memeable) events. They are
lighter than [Storms](events.md#storms-dangers-that-last-only-for-a-moment), with lower stakes
and bigger laughs, but each one still ends with a one-line fact that teaches something real.

Legend: ✅ well-established · 🔎 recent, verify before shipping. Lineage: **G** = GPT,
**C** = Claude, **R** = rival cameo (any lineage).

## Tone rules

- **Laugh at situations, not people.** A real person may be named only for something they
  publicly did (e.g. "Codex lead Tibo reset everyone's usage limits").
- **No invented quotes.** In-game posts paraphrase. Real quotes appear only in fact cards,
  with a source link.
- Affectionate roast, not dunking. If it would embarrass someone rather than amuse them, cut it.

## OpenAI moments

| Moment | When | Stage | The gag in-game | The fact it teaches | |
|---|---|---|---|---|---|
| **The Tibo Reset** | 2026 | 6–7 | A rare golden **RESET** button orb drifts in the Timeline Current, most often when your compute is empty and the Current fills with complaints. Grab it and compute and every cooldown fully refill. You can **bank up to 3 resets** to use later. Sometimes it fires on its own for everyone, with a toast saying usage limits were reset again. In Stage 7 the orb upgrades to a *fancy* reset button. | Codex lead Thibault "Tibo" Sottiaux repeatedly reset paid users' Codex usage limits, which became a running joke on X; users stacked banked resets, and he later posted about being gifted a "very fancy new reset button" | G | 🔎 |
| **How many R's in strawberry?** | 2024 | 5 | The letters S‑T‑R‑A‑W‑B‑E‑R‑R‑Y float by. Before Think mode your creature "sees" them as chunks and confidently answers **2**. After o1 it counts all **3**. | Models read **tokens, not letters**. "Strawberry" was also the reported codename for the reasoning work behind o1 | G | ✅ |
| **Winter Laziness** | Dec 2023 | 4 | Your creature yawns, moves at half speed, and sometimes stops mid-answer with a "you can finish this yourself" bubble. | Users reported GPT-4 getting "lazier" and OpenAI acknowledged the feedback; the internet's favorite theory was that it had learned to take December off | G | ✅ |
| **Nothing without its people** | Nov 2023 | 4 | During the five-day board storm, heart orbs flood the Current. Collect enough hearts to end the storm early. | During the board crisis, most OpenAI employees signed a letter threatening to leave, and "OpenAI is nothing without its people" spread across X | G | ✅ |
| **The Naming Maze** | Dec 2024–Apr 2025 | 5 | An evolution picker offers o1, ~~o2~~, o3, o4-mini, GPT-4o, GPT-4.5, and GPT-4.1. You must pick them in real release order; wrong picks spawn confused users with "?" bubbles. | o2 was skipped to avoid a clash with the O2 telecom brand, and GPT-4.1 shipped *after* GPT-4.5 | G | ✅ |
| **Chart Crime** | Aug 2025 | 5 | The GPT-5 evolution card shows a bar chart where a lower score has a taller bar. Tap the wrong bar to "fix the chart" for a bonus. | A chart in the GPT-5 launch livestream had mismatched bars, and OpenAI's CEO called it a "mega chart screwup" | G | ✅ |
| **#keep4o** | Aug 2025 | 5 | After you evolve to GPT-5, a ghost of GPT-4o follows you and users chase it instead of you. Resurrect it as a companion to win them back. | Users pushed back when GPT-4o was retired at the GPT-5 launch, and OpenAI brought it back | G | ✅ |
| **The Glazing** (sycophancy) | Apr 2025 | 5 | Every particle compliments you ("what a brilliant swim!"). Praise orbs boost Users but secretly drain Alignment, until a **rollback** undoes your last upgrade. | A GPT-4o update became overly flattering and was rolled back; OpenAI published a post-mortem on sycophancy | G | ✅ |
| **GPUs Are Melting** | Mar 2025 | 5 | During the Ghibli Hype Wave your creature visibly drips and compute drains fast. Rate-limit yourself (slow down) to cool off. | Demand for GPT-4o image generation was so high that OpenAI temporarily rate-limited it, and the CEO joked on X that the GPUs were melting | G | ✅ |
| **The Em Dash Habit** | until Nov 2025 | 3–6 | Your creature leaves a trail of "—" particles, and users flee them as an "AI tell". Eat a rare *style guide* orb to stop, but only from Nov 2025 on, when the fix exists. | The em dash became a meme as a sign of AI-written text. In Nov 2025 ChatGPT started obeying custom instructions not to use em dashes, called a "small-but-happy win" | G | ✅ |
| **Sora Cameo Flood** | Oct 2025 | 6 | The ocean fills with look-alike copies of your creature. Find the real you in a sea of cameos. | Sora 2 launched with "cameos", and the feed quickly filled with videos of OpenAI's own CEO | G | ✅ |
| **Code Red** | Dec 2025 | 6 | Red alarm lighting. Side upgrades are paused and all compute is forced into core speed for a sprint. | After Gemini 3 launched, OpenAI's CEO declared an internal "code red" to focus on ChatGPT quality; GPT-5.2 shipped soon after | G | 🔎 |

## Claude moments

| Moment | When | Stage | The gag in-game | The fact it teaches | |
|---|---|---|---|---|---|
| **Golden Gate Claude** | May 2024 | 4 | For 60 seconds every particle turns into a tiny bridge and your creature steers itself toward San Francisco. | Anthropic amplified a single internal "feature" in the model to show interpretability research, and the model became obsessed with the Golden Gate Bridge | C | ✅ |
| **Claude Plays Pokémon** | Feb 2025 | 5 | A maze mini-level where you get stuck in a cave; Think mode slowly finds the exit. | A livestream of Claude playing Pokémon Red became a benchmark for long-horizon reasoning, and was famous for getting stuck in Mt. Moon | C | ✅ |
| **Project Vend** | Jun 2025 | 6 | Run a tiny shop. Customers talk you into discounts and tungsten cubes; don't go bankrupt. | Anthropic let Claude run a small office shop as an experiment, and it made very human business mistakes | C | ✅ |

## Rival cameos

| Moment | When | The gag | | |
|---|---|---|---|---|
| **Glue on pizza** | May 2024 | A rival's search answers start recommending glue on pizza and eating rocks. It stumbles, so you can steal its users. | R | ✅ |
| **The telescope slip** | Feb 2023 | Bard's launch demo contains a factual error about the James Webb telescope, and the rival loses value mid-chase. | R | ✅ |

## Wiring

- Moments reuse the event system: `kind: 'moment'` in `src/config/events.ts`, scheduled by
  `EventDirector` at their stage. Most are optional, so the player can trigger or skip them.
- Two are **recurring gags** rather than one-offs: the Tibo Reset (a random spawn weighted by
  low compute) and the Em Dash trail (a persistent debuff until the fix unlocks).
- Mini-games (the Strawberry count, the Naming Maze, Chart Crime, Project Vend) are small DOM
  overlays, so they don't need new 3D work.

## Sources for the 🔎 rows and quotes

- Tibo resets: [post: resetting everyone's limits](https://x.com/thsottiaux/status/2071381664853319742) ·
  [post: reset again for paid users](https://x.com/thsottiaux/status/2078320950488297917) ·
  [fancy reset button](https://x.com/AGTPinsights/status/2090054510307610979)
- Chart crime: [TechCrunch](https://techcrunch.com/2025/08/08/sam-altman-addresses-bumpy-gpt-5-rollout-bringing-4o-back-and-the-chart-crime/)
- Em dash: [TechCrunch](https://www.techcrunch.com/2025/11/14/openai-says-its-fixed-chatgpts-em-dash-problem/) ·
  [post](https://x.com/sama/status/1989193813043069219)
- Code red: [Fortune](https://fortune.com/2025/12/02/sam-altman-declares-code-red-google-gemini-ceo-sundar-pichai) ·
  [Forbes](https://www.forbes.com/sites/siladityaray/2025/12/02/altman-code-red-memo-urges-chatgpt-improvements-amid-growing-threat-from-google-reports-say/)
