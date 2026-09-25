import { describe, expect, it } from 'vitest';
import { DATA_TYPES, bucketOf, type DataTypeId } from '../config/dataTypes';
import { EVENTS } from '../config/events';
import { LINEAGES } from '../config/models';
import { PARTS } from '../config/parts';
import { RECURRING_GAGS } from '../config/timeline';
import type { FactCard, Lineage } from '../config/types';
import { INTERNET_BIOME } from '../config/world';
import { solve } from '../ui/MiniGames';
import { EventDirector } from './EventDirector';
import { Progress } from './Progress';
import { RunState, gateChecks, rolloutPhase } from './RunState';

const lineages = (Object.keys(LINEAGES) as Lineage[]).filter((l) => LINEAGES[l].forms.length > 1);

function checkCard(card: FactCard, where: string): void {
  expect(card.lines.length, `${where}: lines`).toBeGreaterThan(0);
  expect(card.sources.length, `${where}: sources`).toBeGreaterThan(0);
  for (const line of card.lines) {
    expect(line, `${where}: placeholder`).not.toMatch(/PLACEHOLDER|TODO|TBD|🔎/);
  }
  for (const s of card.sources) expect(s.url, `${where}: source url`).toMatch(/^https:\/\//);
  expect(card.title + card.date, `${where}: 🔎`).not.toMatch(/🔎/);
}

describe('content integrity', () => {
  it('has the GPT lineage ending at GPT-6 Astra', () => {
    const forms = LINEAGES.gpt.forms;
    expect(forms[0].id).toBe('transformer');
    expect(forms.at(-1)?.name).toBe('GPT-6 Astra');
    expect(forms.at(-1)?.finale).toBe(true);
  });

  for (const lineage of lineages) {
    const forms = LINEAGES[lineage].forms;

    describe(`${lineage} forms`, () => {
      it('have unique ids, rising stages 1→7, and sourced fact cards', () => {
        expect(new Set(forms.map((f) => f.id)).size).toBe(forms.length);
        for (let i = 1; i < forms.length; i++) expect(forms[i].stage).toBeGreaterThanOrEqual(forms[i - 1].stage);
        expect(forms[0].stage).toBe(1);
        expect(forms.at(-1)?.stage).toBe(7);
        expect(new Set(forms.map((f) => f.stage)).size).toBe(7);
        for (const f of forms) checkCard(f.fact, f.id);
        for (const f of forms) for (const r of f.rivals) expect(r.blurb.length, `${f.id} rival ${r.name}`).toBeGreaterThan(10);
      });

      it('have recipes that sum to 1 and can actually be eaten', () => {
        for (let i = 1; i < forms.length; i++) {
          const f = forms[i];
          const sum = Object.values(f.recipe).reduce((a, b) => a + (b ?? 0), 0);
          expect(sum, `${f.id} recipe sum`).toBeCloseTo(1, 5);
          const available = new Set<DataTypeId>([...Object.keys(f.spawn)].map((k) => bucketOf(k as DataTypeId)));
          const abilities = RunState.abilities(forms, i - 1);
          if (abilities.has('portals')) for (const k of Object.keys(INTERNET_BIOME.extraSpawn)) available.add(bucketOf(k as DataTypeId));
          for (const type of Object.keys(f.recipe) as DataTypeId[]) {
            expect(available.has(type), `${f.id} needs ${type} but it never spawns`).toBe(true);
            if (DATA_TYPES[type].hidden) expect(abilities.has('think'), `${f.id} needs hidden ${type} before Think mode`).toBe(true);
          }
          expect(f.target, `${f.id} target`).toBeGreaterThan(0);
          // Decoys stay a minority, so a careful player can reach a 65% match.
          const share = Object.entries(f.spawn).filter(([k]) => f.recipe[bucketOf(k as DataTypeId)] !== undefined).reduce((a, [, v]) => a + (v ?? 0), 0);
          expect(share, `${f.id} spawn is mostly decoys`).toBeGreaterThanOrEqual(0.69);
        }
      });

      it('only gate on meters the player already has', () => {
        for (let i = 1; i < forms.length; i++) {
          const g = forms[i].gate;
          if (!g) continue;
          const abilities = RunState.abilities(forms, i - 1);
          if (g.alignment !== undefined) expect(abilities.has('alignment'), `${forms[i].id} alignment gate`).toBe(true);
          if (g.users !== undefined) {
            expect(abilities.has('users'), `${forms[i].id} users gate`).toBe(true);
            expect(forms[i].userRate, `${forms[i].id} userRate`).toBeGreaterThan(0);
          }
          if (g.trust !== undefined || g.rollout) expect(abilities.has('trust'), `${forms[i].id} trust gate`).toBe(true);
          if (g.constitution) expect(abilities.has('constitution'), `${forms[i].id} constitution gate`).toBe(true);
          if (g.rollout) {
            expect(g.rollout.trustSteps.length).toBe(g.rollout.phases.length - 1);
            expect(rolloutPhase(g.rollout, 100)).toBe(g.rollout.phases.length - 1);
          }
        }
      });

      it('reference parts that exist', () => {
        for (const f of forms) for (const p of f.parts ?? []) expect(PARTS[p], `${f.id} part ${p}`).toBeTruthy();
      });

      it('introduce every stage mechanic', () => {
        const all = RunState.abilities(forms, forms.length - 1);
        for (const a of ['alignment', 'editor', 'users', 'timeline', 'tools', 'portals', 'think', 'fork', 'teams', 'trust'] as const) {
          expect(all.has(a), `${lineage} never unlocks ${a}`).toBe(true);
        }
      });

      it('can be played start to finale with no dead ends', () => {
        const progress = new Progress(forms);
        const run = new RunState(lineage);
        const director = new EventDirector(EVENTS);
        let played = 0;
        while (progress.next) {
          const next = progress.next;
          director.enterEra(lineage, progress.current.id, run.flags);
          // Play every event in the era.
          for (let guard = 0; guard < 100 && !director.eraClear; guard++) {
            for (const e of director.update(60, { dietReady: true, still: true, slow: true, nearBeacon: true, toxicity: 0, alignment: 100, trust: 100, rogues: 0 })) {
              if (e.type === 'start') {
                played++;
                if (e.active.spec.objective?.kind === 'minigame') director.resolveMinigame(true);
              }
            }
          }
          expect(director.eraClear, `${progress.current.id} era never clears`).toBe(true);
          // Eat the recipe.
          for (const [type, share] of Object.entries(next.recipe)) progress.add(type as DataTypeId, Math.ceil(next.target * (share ?? 0)) + 1);
          expect(progress.dietReady(), `${next.id} diet`).toBe(true);
          // Meet the gates the way a player would.
          const g = next.gate;
          if (g?.alignment) run.alignment = g.alignment;
          if (g?.users) run.users = g.users;
          if (g?.trust) run.trust = g.trust;
          if (g?.constitution) run.constitution = g.constitution[0];
          expect(gateChecks(g, run).every((c) => c.ok), `${next.id} gates`).toBe(true);
          progress.evolve();
        }
        expect(progress.current.finale).toBe(true);
        expect(played).toBeGreaterThan(10);
      });
    });
  }

  it('pins every event to real forms of its lineage, with sourced facts', () => {
    const ids = new Set<string>();
    for (const e of EVENTS) {
      expect(ids.has(e.id), `duplicate event ${e.id}`).toBe(false);
      ids.add(e.id);
      expect(Object.keys(e.at).length, `${e.id} has no era`).toBeGreaterThan(0);
      for (const [lineage, formId] of Object.entries(e.at)) {
        const forms = LINEAGES[lineage as Lineage].forms;
        expect(forms.some((f) => f.id === formId), `${e.id} → ${lineage}:${formId}`).toBe(true);
        expect(forms.find((f) => f.id === formId)?.finale, `${e.id} pinned to a finale`).toBeFalsy();
      }
      checkCard(e.fact, e.id);
      expect(e.durationSec).toBeGreaterThan(0);
      if (e.kind === 'storm') {
        expect(e.durationSec, `${e.id} storms last 30–90s`).toBeGreaterThanOrEqual(30);
        expect(e.durationSec, `${e.id} storms last 30–90s`).toBeLessThanOrEqual(90);
      }
      if (e.kind === 'hype') expect(e.hype, `${e.id} hype spec`).toBeTruthy();
      if (e.objective?.kind === 'minigame') expect(e.minigame, `${e.id} minigame`).toBeTruthy();
      if (e.disablesPart) expect(PARTS[e.disablesPart]).toBeTruthy();
      if (e.objective?.kind === 'avoidPickups') expect(e.spawns?.some((s) => s.what === 'pickups' && s.bad), `${e.id} has nothing bad to avoid`).toBe(true);
      for (const s of e.spawns ?? []) if (s.what === 'pickups' && e.objective?.kind === 'collect') expect(s.count).toBeGreaterThanOrEqual(e.objective.count);
    }
    for (const g of RECURRING_GAGS) checkCard(g.fact, g.id);
  });

  it('has solvable maze mini-games and winnable shops', () => {
    for (const e of EVENTS) {
      const m = e.minigame;
      if (m?.kind === 'maze') {
        const rows = m.rows.map((r) => r.split(''));
        const r = rows.findIndex((row) => row.includes('S'));
        expect(solve(rows, { r, c: rows[r].indexOf('S') }).length, `${e.id} maze`).toBeGreaterThan(0);
      }
      if (m?.kind === 'shop') {
        const best = m.startCash + m.customers.reduce((s, c) => s + Math.max(...c.options.map((o) => o.cash)), 0);
        expect(best, `${e.id} shop`).toBeGreaterThan(0);
      }
      if (m?.kind === 'order') expect(m.items.filter((i) => !i.decoy).length).toBeGreaterThan(2);
      if (m?.kind === 'chart') expect(m.bars.some((b) => b.value !== b.drawnAs)).toBe(true);
    }
  });

  it('has both kinds of hype verdicts and all three event kinds', () => {
    const verdicts = new Set(EVENTS.filter((e) => e.hype).map((e) => e.hype!.verdict));
    expect(verdicts).toEqual(new Set(['lasting', 'passing']));
    expect(new Set(EVENTS.map((e) => e.kind))).toEqual(new Set(['hype', 'storm', 'moment']));
  });

  it('keeps posts anonymous (no @handles or quotes attributed to people)', () => {
    for (const e of EVENTS) for (const p of e.posts ?? []) expect(p, e.id).not.toMatch(/@\w/);
  });
});
