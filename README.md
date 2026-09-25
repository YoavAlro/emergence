# Emergence

A Spore-like 3D browser game about how AI evolved in the LLM era. Start as an untrained
Transformer, eat the data the real models trained on, and evolve through real model versions,
from GPT-1 to **GPT-6 Astra** or from a 2021 research model to **Claude Opus 5.5**. Ride hype
waves, survive storms pinned to real incidents, and laugh at the funny moments along the way.

It's drawn like a cartoon: toon-shaded 3D creatures with ink outlines, hand-doodled data icons,
and sticker-style HUD panels. Your hero wears its lab's colors (the GPT hero is pale grey-white
with a green knot crest, the Claude hero terracotta with a cream spark), inspired by each company's
style but never copying a logo. Eat fast for **combos** (up to ×5 points), grab **power-ups**
(magnet, spare GPUs, safety filter, double points, longer context), take on quick **challenges**,
bonk a **rival-lab boss** in every stage, and unlock **achievements and skins** that carry across
runs. A guide arrow and an "Eat next" chip always show what to go for; the camera swings to follow
your swimming, and a gentle aim assist helps you snap up what the diet needs.

The full design brief is in **[GAME_DESIGN.md](GAME_DESIGN.md)**; the goal is in [GOAL_PROMPT.md](GOAL_PROMPT.md).

## Play locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (progression, events, content integrity)
npm run build      # typecheck + production build to dist/
npm run smoke      # headless Playwright smoke test (desktop + iPhone, both lineages); needs a build
node scripts/playtime.mjs gpt   # autopilot playthrough that reports minutes per era
```

## Controls

| | Desktop | Touch |
|---|---|---|
| Swim | WASD / arrows | Left thumb (joystick) |
| Look | Drag the mouse | Right thumb |
| Boost | Shift | BOOST |
| Creature editor (Stage 2+) | C | EDIT |
| Grab with tool limbs (Stage 4+) | Hold E | Hold GRAB |
| Think mode (Stage 5+) | Hold Space | Hold THINK |
| Fork / target / recall sub-agents (Stage 6+) | F / T / R | FORK / TARGET / RECALL |
| Switch size form (Claude 3, GPT-5.6) | Q | FORM |
| Bet on a Hype Wave | B | Tap the bet button |
| Use a banked reset | X | RESET |
| Bonk a dizzy boss (double damage) | Boost into it | BOOST into it |
| Menu (settings, trophies & skins, how to play) | Esc | ❚❚ |

## Project layout

| Path | What it is |
|---|---|
| `src/config/` | **All content**: `gptForms.ts`, `claudeForms.ts` (every model form, recipe, gate, fact card), `events.ts` + `claudeEvents.ts` (hypes and storms), `moments.ts`, `timeline.ts` (Current posts, the Tibo Reset), `parts.ts` (creature editor), `dataTypes.ts`, `world.ts`, `bosses.ts` (one rival-lab boss per stage), `labs.ts` (original lab emblems), `achievements.ts` (achievements and skins), `powerups.ts`, `challenges.ts` |
| `src/config/types.ts` | The content schema: forms, events, objectives, modifiers |
| `src/game/Game.ts` | Renderer, main loop, and the glue that runs config-driven effects |
| `src/game/Progress.ts`, `RunState.ts`, `EventDirector.ts`, `Recap.ts`, `swarmRules.ts`, `Score.ts`, `Meta.ts`, `PowerUps.ts`, `Challenges.ts` | Pure game logic (unit tested) |
| `src/game/toon.ts`, `critter.ts`, `Boss.ts`, `Juice.ts`, `src/ui/doodle.ts` | The cartoon look: toon materials, outlines, eyes, doodled icons and emblems, popups, bursts, screen shake |
| `src/game/DataField.ts`, `TimelineCurrent.ts`, `Swarm.ts`, `Hunters.ts`, `Pickups.ts`, `Portals.ts`, ... | World systems |
| `src/ui/` | HUD, fact cards, editor, mini-games, recap, menu, title screen |
| `scripts/smoke.mjs`, `scripts/playtime.mjs` | Headless checks |

## Adding content

Add a form to `gptForms.ts` or `claudeForms.ts` (recipe, spawn mix, rivals, sourced fact card),
or an event to `events.ts` / `moments.ts` / `claudeEvents.ts` pinned to a form's era with `at`.
Events are built from a shared vocabulary (modifiers, spawns, objectives, visuals, mini-games), so
new content needs no engine changes. `src/game/Content.test.ts` checks that every fact card has a
source, every recipe can be eaten, every gate is reachable, and both lineages play start to finale.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to
GitHub Pages. Enable it once under **Settings → Pages → Source: GitHub Actions**.

---

An educational fan project, not affiliated with or endorsed by OpenAI, Anthropic, or any other
organization named. No real logos are used (the lab emblems are original doodles), rival lines are
jokes about situations rather than quotes, and every fact card lists its sources.
