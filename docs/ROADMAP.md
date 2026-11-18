# Roadmap to done

As of 2026-11-18. Phase 0 is complete: the engine works live, beat a prompt-matched single call, and Krish approved both of its first plays (the North Star's first reading).

**Done means:** every engine that should consult this one can do it with no person in a session, the walls hold, and the North Star is counted by Control Center automatically, not by hand.

## Constraints that shape the build

- **The local embedding model cannot run in Control Center.** Its runtime is 548 MB and Vercel's function limit is 250 MB. Control Center already pays for OpenAI `text-embedding-3-small` (`api/_embeddings.ts`), so the hosted engine uses that, and the novelty gate is recalibrated on it before anything generates.
- **A full `diverge` took 251 to 260 seconds live; the engine route allows 300.** The engine needs a time budget that stops new waves before the deadline.
- **Control Center keeps model choice and metering in one place** (`api/_models.ts`, `check-model-routing`, the meter). The hosted engine gets its model and its meter from there, never its own.
- **The growth runners hold no model keys, and growth-mindmake forbids a second model provider.** Every consumer reaches the engine through Control Center.
- **Every pull request in the fleet merges itself when CI is green** (Ruling, Krish, 2026-11-11), and Control Center's main deploys. A merged Control Center change is live.

## Phase 1: the engine ready to be hosted (divergent-thinker) ✅ done 2026-11-18

| Step | What | Gate |
|---|---|---|
| 1.1 | A core entry (`divergent-thinker/core`) whose import graph holds no Anthropic SDK and no local model, so Control Center bundles only what it runs | none |
| 1.2 | Pluggable memory: the archive and the lens statistics behind one store interface (files locally, Supabase in Control Center) | none |
| 1.3 | A time budget: no new wave, attack or judge pass starts once the run's deadline is near | none |
| 1.4 | An OpenAI embedder, gate factors per embedder, and the calibration set shipped in the package so it can run where the key lives | none |
| 1.5 | Installable from GitHub at a pinned commit (`prepare` builds it) | none |

## Phase 2: hosted in Control Center (control-center) 🟡 built, draft [control-center#963](https://github.com/krishanraja/control-center/pull/963), waits on the migration and your ready

| Step | What | Gate |
|---|---|---|
| 2.1 | `api/_divergent.ts`: the engine on Control Center's model and meter (`divergent-<caller>`), its embeddings, a Supabase store, a daily call cap and dollar ceiling per caller | none to build |
| 2.2 | The `divergent` op on the engine route behind `features.divergent`, no version bump (as `humour` shipped), the bundle regenerated | none to build |
| 2.3 | `DIVERGENT_CALLERS` for repositories that are no growth engine (content-engine on its operator key, as humour) | none to build |
| 2.4 | Connector tools for his sessions: `divergent_score`, `divergent_record`, `divergent_run` (the gateway runs one request per operation, so a 25-call run belongs on the connector) | none to build |
| 2.5 | Migration: `divergent_memory`, `divergent_lens_stats` | **Krish: apply the migration** |
| 2.6 | A calibration op that runs the shipped calibration set on Control Center's embedder; generation stays off until it passes | runs after deploy |
| 2.7 | Tool catalog entry (`TOOL_VALUE_CATALOG`, `TOOL_PLACEMENTS`), tests, `docs/app/growth/divergent.md` | none |
| 2.8 | Merge, which deploys | **Krish: model, caps, then merge** |

## Phase 3: consumers wired (one pull request per repository)

| Step | Repository | What |
|---|---|---|
| 3.1 | growth-heartside | Rule 5 at U4 and U5: `diverge` for the recovery plays, filed as proposals behind the walls; the joke lab's score guard; record what went live |
| 3.2 | growth-mindmake | Rule 5; `map_consensus` on the weekly experiment |
| 3.3 | growth-makeyourmindup | Rule 5; the hook score guard before the mix plan |
| 3.4 | content-engine | The daily wildcard through `provoke`; the score guard beside `repeat_review`; record what published |
| 3.5 | growth-legibility, growth-fulltime | Wired and dormant while held: no call while the engine is held |

Each merges itself on green. Each consumer checks every spark against its own walls before it reaches Krish (the lesson of 18 November).

**Cut:** AEO-Engine and hunter (weak fits; their generation is anchored to evidence on purpose), higgsfield-generator (a vendor copy with no venture of its own), content-watcher and krish-clone (no creative step).

## Phase 4: the skill layer (ai-harness) 🟡 proposed, draft [ai-harness#284](https://github.com/krishanraja/ai-harness/pull/284), waits on your admission

| Step | What | Gate |
|---|---|---|
| 4.1 | A proposal with one-line hooks: strategy-brief step 6, krish-principles 5.4, build-apps-with-krish's reset trace, krish-design (one arm only); tool-router's description gains the capability | **Krish: admission ruling** |

## Phase 5: measured automatically (the finish line) 🟡 the reader is built in control-center#963; live when it merges

| Step | What |
|---|---|
| 5.1 | Every engine-sourced proposal carries one `evidence` item labelled `divergent-thinker spark <id>, run <run>` (no protocol change: the schema already allows it) |
| 5.2 | A `READERS` entry in Control Center's North Star refresh counts Krish's approvals of them per week and commits this repository's state line |
| 5.3 | `docs/approvals.md` becomes history; the guide and the integration plan say what is live |

## Decisions

Made (Krish, 2026-11-18):

1. **The hosted model is Opus 5.5,** the model the benchmark measured.
2. **Caps per caller per day:** 1 `diverge`, 20 `provoke` or `challenge`, unlimited `score` and `record`, a $5 daily ceiling.
3. **content-engine's calls count inside its $15 weekly chain cap.**

Still his, each named immediately before it happens:

4. **The migration and the merge** (2.5, 2.8).
5. **The skill hooks' admission** (4.1).
