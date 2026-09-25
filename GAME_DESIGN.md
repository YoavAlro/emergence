# EMERGENCE: Game Design Brief

> The north-star prompt for this project. Hand it to anyone (human or AI) working on the game.

## One-line pitch

You are an early language model swimming in a glowing ocean of data. You eat the data your
real-life lab trained on, evolve through real model versions, ride the hype waves, survive
the storms that nearly derailed real labs, and grow from a blank network into a frontier
model: **GPT-6 Astra** on the GPT path, **Claude Opus 5.5** on the Claude path.

## Core fantasy

Spore's arc (cell → creature → tribe → civilization → space), retold as AI history in
**seven stages**, from pre-training to swarms of agents. The player should come away knowing
roughly, and accurately, how we got from "predict the next word" to autonomous agents, and
which moments were real shifts and which were passing hype.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Name | **Emergence** |
| Lineages | **GPT** (built first) and **Claude**. Both play through all seven stages. |
| Endgame | GPT → **GPT-6 Astra** (Sep 2026) · Claude → **Claude Opus 5.5** (Sep 2026) |
| Tone | **Educational**: real dates, real training data, and short accurate fact cards. Playful, never satirical. |
| Platform | **Desktop and mobile** from day one |
| X / Twitter | A world system called the **Timeline Current**, which spreads virality and hype (see below) |
| Events | **Hype Waves** (passing or lasting), **Storms** (dangers that last only for a moment), and **Moments** (funny playable gags), all timed to real history |

Detail lives in:
- [docs/lineage-gpt.md](docs/lineage-gpt.md): every GPT form, stage by stage
- [docs/lineage-claude.md](docs/lineage-claude.md): every Claude form, stage by stage
- [docs/events.md](docs/events.md): the catalog of hypes, storms, and Timeline moments
- [docs/moments.md](docs/moments.md): funny moments (the Tibo Reset, Strawberry, Chart Crime, Golden Gate Claude...)

## The seven stages

| # | Stage | Spore analog | Era | New mechanic |
|---|---|---|---|---|
| 1 | **Token Soup** (pre-training) | Cell | 2017–2020 | Eat the real training mix to evolve ✅ *built* |
| 2 | **Alignment** (RLHF / Constitution) | Creature | 2021–2022 | Alignment meter, creature editor, gold feedback |
| 3 | **Viral Launch** (users) | Tribal | Nov 2022–2023 | User swarm, **Timeline Current**, first Hype Waves and Storms |
| 4 | **Tools & Internet** | Civilization | 2023–2024 | Tool limbs; portals into the live-internet biome; prompt-injection eels |
| 5 | **Reasoning** | Early Space | Sep 2024–2025 | **Think mode**: slow time and spend compute to see hidden truth |
| 6 | **The Swarm** (agents) | Space: colonies | 2025–mid 2026 | **Fork sub-agents** that forage; agent teams that coordinate |
| 7 | **Frontier** | Space: galactic core | 2026 | Capability gates vs safeguards; phased rollout; the lineage finale |

## Core systems

### 1. Diet (built)
Each model has a target amount of data and a real training recipe. Your **Diet match**
(1 − ½·L1 distance between your mix and the recipe) must reach 65% to evolve. From Stage 2 on,
new "foods" unlock: Code, Human Feedback, Constitution principles (Claude), Tool calls,
Reasoning traces, and Synthetic data.

### 2. Meters
Parameters (size) · Compute · Toxicity · **Alignment** (Stage 2+) · **Users** (Stage 3+) ·
**Hype** (Stage 3+) · **Trust** (Stage 7: regulators and the public).

### 3. The Timeline Current (X / Twitter)
From Stage 3 on, a bright, fast river of posts flows through the ocean.
- **Riding it** multiplies your user gain, because virality is how ChatGPT reached a million users in five days.
- **Screenshot moments**: an impressive streak (combo eating, a clean evolution) creates a
  "screenshot" that floats into the Current and pulls users toward you.
- **Backlash**: the same Current carries viral failures (e.g. the Bing "Sydney" transcripts).
  When a Storm hits, the Current turns red and pushes users away.
- **Rival born in the Current**: Grok (xAI, launched on X in Nov 2023) spawns from it.
- It also delivers **Hype Waves**. Every hype in [docs/events.md](docs/events.md) arrives through it.
- Rule: posts are anonymous, paraphrased summaries of real moments ("AI Twitter is sharing
  ChatGPT screenshots"). **Never fabricate a quote or post attributed to a real person.**

### 4. Hype Waves: passing or lasting
A timed global event. A banner announces it, the Current glows, and hype orbs flood in.
- Eating hype orbs gives fast Users and Hype, and lets you spend evolution points on the hype's upgrade.
- When the wave ends, a **"Hype or shift?"** verdict card appears:
  - **Lasting shift** (e.g. MCP, reasoning models, vibe coding): the upgrade stays and becomes permanent.
  - **Passing hype** (e.g. AutoGPT, AI hardware pins, Moltbook): the upgrade evaporates, and a
    short **hype hangover** follows (users drift away).
- The lesson: learning to tell the two apart. The recap screen scores your bets.

### 5. Storms: dangers that last only for a moment
Timed hazards pinned to real incidents, lasting 30–90 seconds, with a countdown and a
survive-it objective. Examples: ChatGPT "at capacity" outages (compute frozen), Italy's
temporary ban (a region closes), the OpenAI board crisis (the five-day storm), the DeepSeek
R1 shock (a cheap-rival tsunami), and the Claude path's export-control suspension. Surviving
a storm grants a fact card; failing costs Users or Trust.

### 5b. Moments: the funny side
Short comedic gags pinned to memeable real events, each ending in a real fact. Examples: the
**Tibo Reset** (a golden reset button that refills your compute, bankable up to 3), **How many
R's in strawberry?** (tokens vs letters), **Chart Crime**, **The Glazing** (sycophancy),
the **Em Dash** trail, and **Golden Gate Claude**. Rule: laugh at situations, not people, and
never invent quotes. Full list in [docs/moments.md](docs/moments.md).

### 6. Persistent dangers (always around, scaling by stage)
Hallucinations ✅ · Toxic smog ✅ · Rival labs ✅ · Compute starvation ✅ · Model collapse ✅
(too much synthetic data) · Overfitting ✅ (long single-type streaks the recipe doesn't want) ·
Reward hacking ✅ (fake feedback orbs, grey in Think mode) · Jailbreakers ✅ · Prompt-injection eels ✅
(Stage 4+, camouflaged until you think) · Lawyer sharks ✅ (copyright storms) · Runaway agents ✅ (Stage 6+).

### 7. Consequences carry forward
What you ate early can come back later. Example on the Claude path: eating "shadow-library"
books in Stage 1 (they are cheap and plentiful) triggers the **authors' lawsuit** storm in
Stage 6. It is based on the real 2025 case in which training on purchased books was ruled fair use
and pirated copies were not, which ended in a ~$1.5B settlement.

### 8. Think mode (Stage 5+)
Hold THINK to slow time. While thinking, hallucinations turn grey and hidden paths appear.
It costs compute per second, which teaches test-time compute: spend more, answer better.

### 9. The Swarm (Stage 6+)
- **Fork** sub-agents, which cost compute. They are boids that forage whatever data type you point them at.
- **Orchestrate**: tap a target and your agents go get it.
- **Agent Teams** upgrade: agents share targets and self-coordinate instead of reporting only to you.
- **Swarm dangers**:
  - **Runaway agents** wander into smog and pick up prompt injections, which spread between agents.
  - **Cost blowups** drain compute.
  - The **security-exposure storm** (modeled on OpenClaw's January 2026 incidents) leaks part of your swarm.
- Spore tie-in: this is your "tribe → colonies" layer. You stop being one creature and become a system.

### 10. Frontier gates (Stage 7)
- The final evolution requires crossing a **capability threshold** *and* holding enough **Trust** and **Alignment**.
- Crossing it too fast triggers restrictions: a phased rollout where only part of the world can reach you.
- GPT finale: **GPT-6 Astra**, the first OpenAI model rated *Critical* for cybersecurity,
  released in phases (🔎).
- Claude finale: **Claude Opus 5.5** (🔎). Along the way you pass the restricted Mythos
  models and Project Glasswing, where access is limited to defenders.
- Ending card: a timeline recap of your run (your diet, the hypes you bet on, the storms you survived)
  laid over the real history.

## Accuracy & naming rules

- Every fact card line must be verifiable. Mark facts: ✅ well-established · 🔎 recent;
  verify against a primary source (lab announcement, system card, court filing) before shipping.
- Use conservative wording for estimates ("an estimated 100M users").
- Real company and model names appear only as historical facts. No logos, no impersonation,
  and no invented quotes.
- Political and legal events (bans, lawsuits, government disputes) are stated neutrally, as
  facts with dates. The game never takes sides beyond what the record shows.
- The title screen always shows the non-affiliation disclaimer.

## Tech notes (as built)

- `src/config/types.ts` is the content schema. Forms (`gptForms.ts`, `claudeForms.ts`) carry `lineage`,
  `stage` 1–7, a recipe, a spawn mix, `unlocks` / `trainUnlocks` (mechanics), `parts`, a `gate`
  (Alignment, Users, Trust, a Constitution band, or a phased `rollout`), and a sourced fact card.
- Events (`events.ts`, `claudeEvents.ts`, `moments.ts`) are `{ id, kind: 'hype' | 'storm' | 'moment',
  at: { gpt?, claude? }, delaySec, durationSec, objective, modifiers, spawns, visuals, minigame?, hype?,
  requiresFlag?, fact }`. Effects are built from a shared vocabulary, so new history needs no engine code.
- `EventDirector` (pure, tested) schedules each era's events and scores objectives; evolution waits until
  the era's events are done, and pending events hurry once the diet is ready.
- The Timeline Current is a Catmull-Rom tube with instanced post quads and a flow field.
- Swarm forks are boids that forage through `DataField.nearest()` / `take()`; infection rules are in
  `swarmRules.ts`.
- `Content.test.ts` checks every lineage for sourced cards, eatable recipes, reachable gates, and a full
  start-to-finale playthrough.

## Milestones

| # | Milestone | Contents |
|---|---|---|
| M1 ✅ | Stage 1 slice | Ocean, controls, diet, GPT-1 → GPT-3, hallucinations, smog, rivals, fact cards |
| M2 | Stages 2–3 (GPT) | Codex, InstructGPT, ChatGPT, GPT-4; Alignment and Users meters; creature editor |
| M3 | Event system | EventDirector, Hype Waves, Storms, Moments, the Timeline Current, the "Hype or shift?" verdicts |
| M4 | Stages 4–5 (GPT) | Tool limbs, the internet biome, injection eels, Think mode, o1 → GPT-5 |
| M5 | Stage 6 (GPT) | The Swarm: fork and orchestrate agents, agent-to-agent dangers |
| M6 | Stage 7 (GPT) | Frontier gates, Trust meter, GPT-5.6 Sol → **GPT-6 Astra** finale and recap |
| M7 | Claude lineage | `CLAUDE_FORMS` 1–7, Constitution food and meter, Claude-only storms → **Opus 5.5** |
| M8 | Polish | Audio, accessibility, a performance pass, a fact-verification pass over every 🔎 |
