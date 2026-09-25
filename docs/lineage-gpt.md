# GPT lineage: Transformer → GPT-6 Astra

Legend: ✅ well-established · ✅² recent, verified against the primary source listed in the game's fact card
(Sep 2026 fact pass). Nothing marked 🔎 ships. Shipped content lives in `src/config/gptForms.ts`.

Forms are in release order. Recipes from Stage 2 on are approximations of what each release emphasized
(OpenAI stopped publishing training mixes after GPT-3); the diet screen says so.

| Stage | Form | Date | Evolve by eating / unlock | Notes | |
|---|---|---|---|---|---|
| 1 | Transformer (start) | Jun 2017 | n/a | "Attention Is All You Need" | ✅ |
| 1 | GPT-1 · 117M | Jun 2018 | Books 100% (BookCorpus, ~7,000 books) | ELMo | ✅ |
| 1 | GPT-2 · 1.5B | Feb 2019 | Web 100% (WebText, Reddit-linked) | BERT; staged release through Nov 2019 | ✅ |
| 1 | GPT-3 · 175B | May 2020 | Web ~82% (Common Crawl 60% + WebText2 22%) · Books 16% · Wiki 3%; the paper's weights round to 101%, so the game uses 81/16/3 | T5, Turing-NLG; API from Jun 2020 | ✅ |
| 2 | Codex | Aug 2021 | Code → *creature editor, Alignment meter, code limb* | Powered GitHub Copilot | ✅ |
| 2 | InstructGPT | Jan 2022 | Human Feedback (gate: Alignment 50) | Raters preferred 1.3B InstructGPT over 175B GPT-3 | ✅ |
| 3 | ChatGPT | Nov 30, 2022 | Feedback + dialogue (gate: Alignment 60) → *Users, Timeline Current* | 1M users in ~5 days | ✅ |
| 3 | GPT-4 | Mar 14, 2023 | Web + images (gate: 100M users) → *vision eyes* | ~100M monthly users by Jan 2023 (UBS/Similarweb est.) | ✅ |
| 4 | GPT-4 + Plugins | Mar 23, 2023 | Tool calls → *GRAB, internet portals, injection eels* | | ✅ |
| 4 | Function calling | Jun 13, 2023 | Tool calls + code | | ✅ |
| 4 | GPT-4 Turbo & GPTs | Nov 6, 2023 | 128K context tail | Board crisis right after; Grok spawns from the Current | ✅ |
| 4 | GPT-4o | May 13, 2024 | Images & audio → *voice fins* | | ✅ |
| 5 | o1-preview | Sep 12, 2024 | Reasoning traces (Think mode unlocks while training toward it) | | ✅ |
| 5 | o3 | Dec 20, 2024 (announced) · Apr 16, 2025 (released) | Reasoning + tools + images | No o2 (O2 telecom) | ✅ |
| 6 | Operator & Deep Research | Jan 23 / Feb 2, 2025 | Tool calls → *FORK sub-agents* | | ✅ |
| 6 | Codex (agent) | May 16, 2025 | Code + tools + reasoning | | ✅ |
| 6 | ChatGPT agent | Jul 17, 2025 | Merges Operator and Deep Research | | ✅ |
| 6 | GPT-5 | Aug 7, 2025 | Mixed + reasoning; fast + thinking with a router | Chart crime, #keep4o | ✅ |
| 6 | GPT-5.2 | Dec 11, 2025 | Instant / Thinking / Pro | Shipped 9 days after the "code red" memo | ✅² |
| 6 | GPT-5.4 | Mar 5, 2026 | Native computer use; ~1M context in the API | | ✅² |
| 6 | GPT-5.5 | Apr 23, 2026 | Thinking / Pro; API next day | | ✅² |
| 7 | GPT-5.6 (Sol / Terra / Luna) | Jul 9, 2026 (GA) | → *size forms, Trust meter, Agent Teams* | Limited to ~20 trusted partners from Jun 26 at the US government's request | ✅² |
| 7 | **GPT-6 Astra** (finale) | Sep 3, 2026 | Gate: Alignment 60 + Trust 60, then a phased rollout (Trust 70 → 85) | OpenAI's first model at the Critical cybersecurity level under its Preparedness Framework; cyber-program partners first | ✅² |

Order note: GPT-5 sits in Stage 6 because the first agents (Operator, Jan 2025) shipped before it.

GPT-only storms and moments are listed in [events.md](events.md) and [moments.md](moments.md).
