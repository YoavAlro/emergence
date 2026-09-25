# GOAL: Build "Emergence", a Spore-like 3D browser game about how AI evolved in the LLM era

## What you are building
A Three.js + TypeScript + Vite browser game (no backend, desktop and mobile). The player is a
language model swimming in a glowing 3D ocean of data. They eat the data their real lab
trained on, evolve through real model versions, ride hype waves, survive short storms and
funny moments from real AI history, and grow from a blank Transformer into a frontier model.
Two lineages:
- **GPT path**: Transformer (2017) → … → **GPT-6 Astra** (Sep 2026).
- **Claude path**: research model (2021) → … → **Claude Opus 5.5** (Sep 2026).

The player should finish knowing, accurately, how we got from "predict the next word" to
agent swarms, and which moments were real shifts and which were passing hype.

## Non-negotiables
1. **Educational and accurate.** Every fact card line must be verifiable. Mark recent facts
   🔎 and check them against primary sources (lab announcements, system cards, court filings)
   before shipping. Use conservative wording for estimates.
2. **Tone:** playful and affectionate. Laugh at situations, not people. **Never invent quotes**
   or posts attributed to real people; paraphrase, and put real quotes only in fact cards with sources.
3. **No impersonation:** no logos, and a non-affiliation disclaimer on the title screen.
   Political and legal events are stated neutrally, as dated facts.
4. **Mobile from day one:** touch joystick (left), drag-to-look (right), on-screen buttons;
   60fps laptop / 30+ mid-range phone.
5. **Data-driven:** models, data types, rivals, events, and facts live in `src/config/`.
   Adding content never requires engine changes.

## The seven stages (the Spore arc)
| # | Stage | Spore | Era | Core mechanic |
|---|---|---|---|---|
| 1 | Token Soup: pre-training | Cell | 2017–20 | **Diet**: eat the real training mix; you need a 65% match to evolve |
| 2 | Alignment | Creature | 2021–22 | Alignment meter, creature editor, gold Human Feedback; Claude's Constitution meter (too low: toxic; too high: over-refuses) |
| 3 | Viral Launch | Tribe | Nov 2022–23 | Users meter, the **Timeline Current** (X/Twitter), first Hype Waves and Storms |
| 4 | Tools & Internet | Civilization | 2023–24 | Tool limbs, live-internet portals, prompt-injection eels |
| 5 | Reasoning | Early space | Sep 2024–25 | **Think mode**: slow time and spend compute to reveal hallucinations |
| 6 | The Swarm | Colonies | 2025–mid 26 | **Fork sub-agents** that forage; Agent Teams that coordinate; runaway-agent dangers |
| 7 | Frontier | Galactic core | 2026 | Capability gate + Trust + Alignment; phased rollout; finale and recap |

GPT milestones: GPT-1 (books) · GPT-2 (WebText) · GPT-3 (Common Crawl mix) · Codex ·
InstructGPT · ChatGPT · GPT-4 · plugins/browsing · GPT-4o · o1 · o3 · GPT-5 · Operator /
Codex agent / ChatGPT agent · GPT-5.x · GPT-5.6 Sol · **GPT-6 Astra** (first OpenAI model rated
Critical for cyber; phased rollout).
Claude milestones: Constitutional AI · Claude 1 · Claude 2 (100K) · Claude 3 family (switch
between Haiku, Sonnet, and Opus forms) · 3.5 Sonnet + Artifacts · computer use · MCP · 3.7 Sonnet
(extended thinking) + Claude Code · Claude 4 · Opus 4.5 · Opus 4.6 (Agent Teams) · Mythos /
Glasswing · Fable 5 · Opus 5 (1M) · **Claude Opus 5.5**.

## World systems
- **Data Ocean:** instanced glowing particles colored by type (Books, Web, Wikipedia, Code,
  Human Feedback, Constitution, Tool calls, Reasoning traces, Synthetic). Bloom plus a
  bioluminescent look; the creature grows and sprouts parts as it evolves.
- **Meters:** Parameters, Compute, Toxicity, Alignment, Users, Hype, Trust.
- **Timeline Current (X/Twitter):** a fast river of posts. Riding it multiplies users,
  impressive plays become viral "screenshots", backlash turns it red, and Grok spawns from it.
  It delivers every Hype Wave.
- **Hype Waves:** timed; bet evolution points on the hype's upgrade. A "Hype or shift?"
  verdict card follows. *Lasting* upgrades stay (MCP, reasoning, vibe coding, agent teams).
  *Passing* ones evaporate and leave a hangover (AutoGPT, the GPT Store, AI gadgets, Moltbook).
- **Storms (30–90s dangers):** ChatGPT "at capacity" outages · Sydney · Italy's ban · the
  five-day board crisis · NYT lawsuit · DeepSeek R1 shock · GPUs melting · the OpenClaw agent
  security exposure · the Pentagon supply-chain dispute (Claude) · the export-control suspension (Claude).
- **Moments (funny gags, each ending in a real fact):**
  - The **Tibo Reset**: a golden reset button that refills compute, bankable ×3, that sometimes resets for everyone.
  - **How many R's in strawberry?** (tokens vs letters).
  - Winter Laziness · Nothing without its people · the Naming Maze (no o2; 4.1 after 4.5) ·
    Chart Crime · #keep4o · The Glazing (sycophancy rollback) · the Em Dash trail · the Sora
    cameo flood · Code Red.
  - Claude: Golden Gate Claude · Claude Plays Pokémon · Project Vend.
  - Rivals: glue on pizza · Bard's telescope slip.
- **Persistent dangers:** hallucinations, toxic smog (PR scandal), rival labs, compute
  starvation, model collapse, overfitting, reward hacking, jailbreakers, lawyer sharks, runaway agents.
- **Consequences:** early choices come back. For example, cheap shadow-library books in Stage 1
  trigger the authors' lawsuit storm later.

## Build order (each milestone ends playable, tested, and deployed)
M1 ✅ Stage 1 slice → M2 Stages 2–3 (GPT) → M3 event system (Hypes, Storms, Moments,
Timeline Current) → M4 Stages 4–5 → M5 Stage 6 Swarm → M6 Stage 7 + GPT-6 Astra finale →
M7 Claude lineage → Opus 5.5 → M8 polish (audio, accessibility, performance, fact-verification pass).

## Definition of done
Both lineages are playable from start to finale in about 60–90 minutes. Every stage mechanic
works on desktop and touch. Every fact card is sourced and verified. The recap screen compares
the player's run (diet, hype bets, storms survived) with real history. It deploys to GitHub
Pages from CI, with unit tests on progression and event logic.

Detailed specs: `GAME_DESIGN.md`, `docs/lineage-gpt.md`, `docs/lineage-claude.md`, `docs/events.md`, `docs/moments.md`.
