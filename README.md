# Emergence

A Spore-like 3D browser game about how AI evolved in the LLM era. Start as an untrained
Transformer, eat the data the real models trained on, and evolve GPT-1 → GPT-2 → GPT-3,
while dodging hallucinations, toxic data, and rival labs.

The full design brief is in **[GAME_DESIGN.md](GAME_DESIGN.md)**.

## Play locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (progression logic)
npm run build      # typecheck + production build to dist/
```

**Desktop:** WASD to swim, drag to look, Shift to boost.
**Mobile:** drag on the left half for the joystick, drag on the right half to look, and hold BOOST.

## Project layout

| Path | What it is |
|---|---|
| `src/config/models.ts` | Every model form: training recipe, spawn mix, rivals, fact card |
| `src/config/dataTypes.ts` | Data particle types (color, blurb) |
| `src/game/Game.ts` | Renderer, bloom, main loop, hazards, evolution |
| `src/game/Progress.ts` | Diet tracking, the "diet matches history" score, evolve rules (unit tested) |
| `src/game/DataField.ts` | Instanced data particles |
| `src/game/Player.ts`, `Rivals.ts`, `Smog.ts`, `Ocean.ts` | World entities |
| `src/game/Input.ts` | Keyboard, mouse, and touch controls |
| `src/ui/` | HUD, fact cards, title screen |

## Adding a model

Add an entry to `OPENAI_FORMS` in `src/config/models.ts` with its `recipe` (the real training
mix), a `spawn` mix, rivals, and a fact card, then set `playable: true`. No engine changes are
needed unless the model introduces a new mechanic.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds, and publishes to
GitHub Pages. Enable it once under **Settings → Pages → Source: GitHub Actions**.

---

An educational fan project, not affiliated with or endorsed by OpenAI or any other organization named.
