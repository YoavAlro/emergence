# EMERGENCE: Game Design Brief

> The north-star prompt for this project. Hand it to anyone (human or AI) working on the game.

## One-line pitch

You are an early language model swimming in a glowing ocean of data. You eat the same data
your real-life lab trained on, evolve through real model versions, dodge the dangers that
nearly derailed real labs, and grow from a blank Transformer into ChatGPT.

## Core fantasy

Spore's cell → creature → tribe arc, retold as AI history: **pre-training → alignment →
deployment**. The player should come away knowing, roughly and accurately, how LLMs came to be.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Name | **Emergence** |
| Lineage | **OpenAI / GPT first**. Claude lineage comes later and is shown as "coming soon". |
| Scope | **Stages 1–3**: Token Soup → Alignment → Deployment (ends at the ChatGPT launch) |
| Tone | **Educational**: real dates, real training data, and short accurate fact cards. Playful, never satirical. |
| Platform | **Desktop and mobile** from day one: touch joystick, drag-to-look, boost button |

## Tech stack

- Three.js + TypeScript + Vite. No backend; runs fully in the browser.
- Bloom postprocessing (`UnrealBloomPass`) for the bioluminescent look.
- One `InstancedMesh` for all data particles.
- DOM overlay for the HUD and fact cards.
- Save to `localStorage`.
- Deploy to GitHub Pages from CI.
- **Data-driven**: every model, data type, rival, and fact lives in `src/config/`.
  Adding a model means adding a config entry, not engine code.
- Target: 60fps on a laptop, 30+ on a mid-range phone (fewer particles, lower pixel ratio on touch).

## The world: the Data Ocean

A spherical 3D sea bounded by a faint neural lattice. You swim in 3rd person, and forward
means wherever you are looking. Data floats as glowing particles, colored by type:

| Type | Color | Real-world source |
|---|---|---|
| Books | blue | BookCorpus, Books1/Books2 |
| Web | green | WebText (Reddit-linked pages), Common Crawl |
| Wikipedia | white | English Wikipedia |
| Code | orange | GitHub (unlocks in Stage 2) |
| Human Feedback | gold | Labeler rankings for RLHF (Stage 2+) |

## Core loop

1. Each model has a **target amount** of data and a **real training recipe**.
2. The ocean offers a *mix* of types, including decoys. You choose what to eat.
3. Your **Diet match** (1 − ½·L1 distance between your mix and the real recipe) must reach
   **65%** to evolve. This is how the game teaches what each model actually trained on.
4. On evolving, a fact card shows the real model, its date and size, and your diet against the real one.

## Progression

### Stage 1 · Token Soup (Pre-training), like Spore's Cell stage (✅ built)

| Evolve into | Date | Size | Real recipe | Rival predator |
|---|---|---|---|---|
| (start) Transformer | Jun 2017 | untrained | n/a | none |
| GPT-1 | Jun 2018 | 117M | Books 100% (BookCorpus) | ELMo (AllenAI) |
| GPT-2 | Feb 2019 | 1.5B | Web 100% (WebText) | BERT (Google) |
| GPT-3 | May 2020 | 175B | Web 81% · Books 16% · Wiki 3% | T5 (Google), Turing-NLG (Microsoft) |

### Stage 2 · Alignment (Fine-tuning & RLHF), like Spore's Creature stage (next)

- **Codex** (Aug 2021): eat Code. Unlocks a "code limb" part.
- **InstructGPT** (Jan 2022): eat rare gold Human Feedback. It introduces an **Alignment** meter
  and a **creature editor** where you spend evolution points on parts:
  - Attention Heads: wider eat/vision radius
  - Context Window: a tail that lengthens and gives a longer boost
  - Code Limbs: faster movement
  - Refusal Shell: resists jailbreakers
- Lesson: the 1.3B InstructGPT beat the 175B GPT-3 with human raters. Alignment beats raw size.

### Stage 3 · Deployment (Users), like Spore's Tribal stage (next)

- **ChatGPT launch** (Nov 30, 2022): the ocean floods with **users**, small lights that
  orbit you. A counter races through "1M users in 5 days" and "~100M by Jan 2023".
- Users generate feedback (gold) and compute (revenue), but also bring **jailbreakers**.
- Keep users happy (helpfulness), keep toxicity low, and fend off rival chatbots.
- Stage ends with a GPT-4 (Mar 2023) teaser, which leads into a future Stage 4 (Tools / Internet access).

## Dangers

| Danger | In-game form | Effect | Status |
|---|---|---|---|
| Hallucination | Iridescent, color-shifting particles that look like food | Lose data; controls drift for 4s | ✅ |
| Toxic data | Drifting red smog clouds | Toxicity rises; at 100 a **PR scandal** costs 25% of your data | ✅ |
| Rival labs | Bigger predator models, labeled with name and org | A hit costs 15% of your data and shows a fact about the rival | ✅ |
| Compute starvation | Compute bar | Boosting drains it and it regenerates slowly | ✅ |
| Model collapse | Silver swarm of synthetic data (your own outputs) | Creature blurs and loses detail | Stage 2 |
| Overfitting | Eating one type far past the recipe | Other stats decay | Stage 2 |
| Reward hacking | Shiny fake reward orbs | Score goes up but alignment secretly drops | Stage 2 |
| Jailbreakers | Eels that latch on and steer you | Shake them off; the Refusal Shell resists | Stage 3 |
| Copyright lawsuits | Lawyer sharks near paywalled data | Drain compute; licensing-deal pickups grant immunity | Stage 3 |
| Data wall | The ocean thins out late in the game | Forces synthetic data or licensing | Stage 4 |

## Art & tone

Bioluminescent deep sea meets neural network: dark navy fog, bloom, and soft glowing particles.
The player is a translucent cell whose orbiting neurons multiply with each version, and it
grows physically as parameters grow. Rivals are spiky magenta icosahedrons.

## Accuracy & naming rules

- Every fact card line must be verifiable. Use conservative wording ("an estimated") where
  figures are estimates.
- Real company and model names appear only as historical facts. No logos, no impersonation.
- The title screen always shows the non-affiliation disclaimer.

## Milestones

1. **M1: Stage 1 slice** ✅: ocean, swimming (desktop + touch), diet system, GPT-1 → GPT-3,
   hallucinations, smog, rivals, fact cards, save, and Pages deploy.
2. **M2: Stage 2**: Codex and InstructGPT, the Alignment meter, the creature editor,
   and the model collapse / overfitting / reward hacking dangers.
3. **M3: Stage 3**: the ChatGPT launch, the user swarm, jailbreakers, lawyer sharks, and the GPT-4 teaser.
4. **M4: Polish**: audio (synth ambient plus eat/evolve sounds), a timeline recap screen,
   accessibility options, and a performance pass.
5. **Later**: the Claude lineage (Constitutional AI, long-context tail, computer use) and
   Stage 4 (Tools / Internet access).
