Build "Emergence" in this repo: a Spore-like Three.js + TypeScript + Vite browser game about AI history. The player is a language model swimming in a 3D ocean of data, eating the data its real lab trained on to evolve through real model versions. Full spec: GOAL_PROMPT.md, GAME_DESIGN.md, docs/*.md. Read them first and follow CLAUDE.md.

Lineages:
- GPT: Transformer (2017) through GPT-6 Astra (Sep 2026)
- Claude: research model (2021) through Claude Opus 5.5 (Sep 2026)
(model lists in docs/lineage-gpt.md and docs/lineage-claude.md)

Seven stages, each with a working mechanic:
1 Token Soup: eat the real training mix, 65% diet match to evolve (built)
2 Alignment: Alignment meter, creature editor, Human Feedback; Claude Constitution meter
3 Viral Launch: Users meter, Timeline Current (X/Twitter river that spreads virality and hype)
4 Tools & Internet: tool limbs, internet portals, prompt-injection eels
5 Reasoning: Think mode (slow time, spend compute, reveal hallucinations)
6 The Swarm: fork sub-agents that forage, Agent Teams, runaway-agent dangers
7 Frontier: capability gate + Trust + Alignment, phased rollout, finale and recap screen

Event system (config-driven, per docs/events.md and docs/moments.md):
- Hype Waves with a "Hype or shift?" verdict: lasting upgrades stay, passing ones evaporate
- Storms: 30-90s dangers pinned to real incidents
- Moments: funny playable gags (Tibo Reset, strawberry R-count, Chart Crime, Naming Maze, sycophancy rollback, em dash trail, Golden Gate Claude, etc.)
- Persistent dangers and early choices with later consequences

Rules:
- Accurate and educational: every fact card is sourced; verify 🔎 facts against primary sources before shipping, fix or cut anything unverifiable
- Laugh at situations, not people; never invent quotes attributed to real people; no logos; show the non-affiliation disclaimer; state political/legal events neutrally
- Desktop and touch controls for every feature; 60fps laptop, 30+ mid-range phone
- All content in src/config/; the engine never hardcodes history

Work in milestone order: M2 GPT stages 2-3, M3 event system, M4 stages 4-5, M5 stage 6, M6 stage 7 + Astra finale, M7 Claude lineage to Opus 5.5, M8 polish (audio, accessibility, performance, fact pass). Each milestone ends with tests + build passing, a Playwright smoke test (desktop + iPhone viewport, no console errors, screenshots reviewed), a commit pushed to main, and the milestone ticked in GAME_DESIGN.md.

Done when ALL are true:
1. Both lineages are playable start to finale (~60-90 min each) with no dead ends
2. All 7 stage mechanics, Hype Waves, Storms, Moments, and the Timeline Current work on desktop and touch
3. Every fact card has a source and no unverified 🔎 facts remain in shipped content
4. The recap screen compares the player's run to real history
5. npm test and npm run build pass; unit tests cover progression and event logic
6. The Playwright smoke test passes for both lineages
7. All work is pushed to main and M2-M8 are ticked in GAME_DESIGN.md
