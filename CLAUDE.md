# Emergence: agent guide

A Spore-like Three.js game about AI history. **Start by reading `GOAL_PROMPT.md`**, the goal
and its non-negotiables. The detailed specs are in `GAME_DESIGN.md` and `docs/`.

## Commands
```bash
npm install
npm run dev        # local dev server
npm test           # vitest (progression/event logic)
npm run typecheck  # tsc
npm run build      # typecheck + production build
```
Before every commit, run `npm test && npm run build`.

## Rules
- Content (models, data types, rivals, events, moments, facts) lives in `src/config/`. Engine
  code must not hardcode history.
- Every fact card line needs a source. Mark unverified recent facts 🔎 in the docs, and verify them before shipping.
- Never invent quotes attributed to real people. The jokes are about situations, not people.
- Every feature must work with touch controls (test at phone width) as well as keyboard and mouse.
- Keep unit tests for game logic (`src/game/*.test.ts`). Don't unit-test rendering.
- Visual check: run a headless Playwright smoke test (desktop + iPhone viewport) and look at screenshots.
- When a milestone lands, tick it in `GAME_DESIGN.md` → Milestones.
