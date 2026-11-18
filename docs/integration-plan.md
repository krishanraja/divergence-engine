# Integration plan: who consults divergent-thinker, where, and when

As of 2026-11-18. Built from a source-level read of ai-harness, control-center, content-engine, inspirationhouse, content-watcher, humour-engine, the five growth-* repos, mindmake, AEO-Engine, hunter, higgsfield-generator and krish-clone. Every load-bearing claim below was checked by an independent verifier told to refute it. Corrections from that pass are folded in.

## The call

**Point the engine at the one thing every growth engine is told to do and none of them does in code: the U5 recovery plays.** Run it by hand this week for Heartside and Mindmake through the MCP server in a Claude Code session on your machine. Build no new infrastructure until you have approved at least one play it produced.

Why this, first:

- All five growth engines carry the same protocol rule, word for word: "at U4 one bold swing, at U5 three unconventional recovery plays, each different in kind" (`docs/control-center/ENGINE-PROTOCOL.md:894` in four repos, `:917` in growth-mindmake).
- No Python, mjs, js or ts file in any of them implements it. The plays exist only as hand-written sections in plan docs (`growth-heartside/docs/plans/2026-11-13-order-loop.md:101`, `growth-makeyourmindup/docs/plans/2026-11-13-counted-lattice.md:79`).
- Four of the five are at U5, stalled. Full Time is at U4, unmeasured.
- "Three plays, each different in kind" is exactly what the engine's portfolio step produces: a few high-scoring ideas chosen to be far from each other.

**The sharper alternative:** skip the manual phase and build the Control Center route now (Phase 1 below). It is faster to scale, but it means building before there is any evidence that a single play was worth approving. Given the pattern of building while the growth numbers sit at U5, I would not take it.

## The pattern to copy: Control Center hosts the model call

Control Center already runs a specialist model call for growth engines, and that is the template here.

- `POST /api/growth/engines/<slug>/humour` runs humour-engine calls on Control Center's own Anthropic key (`control-center/api/growth/engines/[engine].ts:36`, `api/_humour.ts:2-3`).
- Each engine authenticates with its own bearer, checked by hash in the engine registry (`api/_growthEngines.ts:1212-1220`).
- Calls are capped per engine per day (`HUMOUR_DAILY_CAP = 200`, `api/_humour.ts:38`) and metered under `humour-<slug>` with priced cost.
- The growth runners hold no generator keys by design (`growth-makeyourmindup/engine/credits.py:6`).

The same route shape solves all four problems a direct integration would hit:

| Problem | Evidence | Fixed by hosting in Control Center |
|---|---|---|
| Runners hold no model keys | `credits.py:6`, `CREDITS-SESSION.md:5` | Control Center's key, never exported |
| growth-mindmake forbids a parallel model provider | `growth-mindmake/AGENTS.md`, one owner per responsibility | Control Center stays the one provider |
| Namespace memory is lost on ephemeral GitHub runners | engine archive is local files under `DIVERGENT_HOME` | Archive moves to Control Center's Supabase |
| Cloud and claude.ai sessions cannot reach a local stdio server | skills are served only via Control Center | Gateway operation alongside the route |

## Cost ladder

Default to the cheapest rung that answers the question. Measured where marked; the rest are estimates.

| Rung | Tool | Model calls | Cost | Use as |
|---|---|---|---|---|
| 0 | `score_divergence` with known `obvious`, `record_outputs` | 0 | $0 | Guardrail on outputs that already exist; memory of what shipped |
| 1 | `map_consensus` | 1 | cents (est.) | See the default before choosing |
| 2 | `provoke` | 2 | **$0.15, 85 s (measured, 18 Nov)** | Routine fresh options |
| 3 | `challenge` | 3 | cents (est.) | Attack and push one existing idea |
| 4 | `diverge` | 23 to 29 (measured) | **$0.91 to $1.37, about 10 minutes (measured)** | Weekly, behind a U4/U5 trigger and your approval |

Existing specialist calls in the fleet cost $0.0015 to $0.005 each. `diverge` is two to three orders of magnitude above that, so it never runs on a schedule without a cap.

## Where each repo consults it, ranked by likely North Star impact

### 1. growth-heartside ($50,000 by 28 December; U5, stalled)

| Point | Tool | Trigger | Namespace / target |
|---|---|---|---|
| The three U5 recovery plays (protocol rule 5) | `diverge`, then `challenge` on the top play | Weekly report, while at U5 and nothing is proposed. Not while a plan already waits on you | `growth-heartside` / `strategy` |
| Joke lab screen, after the 4-gram `RETREAD` and `DUPLICATE` gates in `factory/jokelab.py` | `score_divergence` | Every run | `growth-heartside:jokes` / `video` |
| Seed memory | `record_outputs` with live posts and the 47 floor lines in `factory/floor.json` | Once, then after each post | `growth-heartside:jokes` |

The score guard catches retreads the 4-gram check misses, such as the 17 November case that needed a hand-written `FORMAT_SIGNATURES` entry. Feed `growth.py` `BANNED`, `SLOP` and `RETIRED` as `bannedWords`, and pass the current order-loop plays as `cliches` so the engine has to go past them.

### 2. growth-mindmake (20 good meetings a week by 30 November; U5, 0 meetings)

| Point | Tool | Trigger | Namespace / target |
|---|---|---|---|
| Routes to good meetings | `diverge` | Once now, then each weekly review while at U5 | `growth-mindmake` / `strategy` |
| `HUMAN_IP` room messages and the "Who decided?" framing | `challenge` | Once per change | `growth-mindmake` / `writing` |
| The weekly-review experiment | `map_consensus` | Weekly, so the one change is not the default | `growth-mindmake` |

This is the most urgent deadline. It must go through Control Center (no new model provider), and every drafted word still passes the voice check.

### 3. growth-makeyourmindup (2,500 by 28 December; U5)

| Point | Tool | Trigger | Namespace / target |
|---|---|---|---|
| Borrowed-audience acquisition | `diverge` | Monday report at U4/U5. Pass the three counted-lattice plays and "post more" as `cliches` | `growth-makeyourmindup` / `strategy` |
| Substack Note and caption hooks | `score_divergence` against recent Notes | Before the weekly mix plan is approved | `growth-makeyourmindup:hooks` / `writing` |

Its 16 November review found reach, not polish, is the constraint, and going from 20 to 50 posts a week did not double exposure. That is a request for different routes, not more volume.

### 4. content-engine (30 finished assets a week by 30 November; 3 against 12)

| Point | Tool | Trigger | Namespace / target |
|---|---|---|---|
| Plan-week: the wildcard each publishing day's set must contain | `provoke` | Once per publishing day's set. Never for lookalike options, which copy formats on purpose | `content-engine-ideas` / `writing` |
| Plan-week step 3b, beside `repeat_review` and `board_feed.py gate` | `score_divergence` against `recent_posts` and earlier options | Weekly | `content-engine-ideas` |
| Directed shoot step 1 (the current next step in NOW.md) | `diverge`, `temperament: wild` | Once per experiment, on your yes | `content-engine-directed-shoot` / `video` |
| Funny lines | `provoke`, then humour-engine checks they land | Weekly | `content-engine-funny` / `writing` |

Constraints: the scheduled ideas job runs Saturday and makes no API-key Claude runs, and there is a $15 weekly chain cap. A `provoke` through Control Center is a paid call, so it needs your ruling on whether it sits inside or outside the chain. Do not use the engine for titles or hooks ("What the hell does that even mean?", `titles-round.md:5`), and do not run its `challenge` beside content-engine's own challenge route, which already does steelman and sharper take. Pass `vendor/makeyourmindup/kill-list/kill-list.v1.json` as `bannedWords`. Ideas the engine proposes must be labelled as engine-sourced, never presented as yours.

### 5. ai-harness (the skill layer)

Do not create a new skill yet. It would struggle with the harness's own missing-skill test, and the engine is a capability, not a domain. Instead:

1. **Catalog entry in Control Center:** one line in `TOOL_VALUE_CATALOG` and one in `TOOL_PLACEMENTS` (`control-center/api/harness/_tool-value-catalog.ts`). These surface as `tools` and `placements.tools` through `get_tool_value_catalog`. tool-router's description covers external evidence and service operations, so it may need one added clause before it routes here.
2. **One-line hooks in existing skills,** each limited to material work:
   - strategy-brief step 6 (Alternatives): `map_consensus`, and `challenge` on the selected route.
   - krish-principles 5.4, "The sharper alternative": `challenge` on the call, after the call is made, never instead of it.
   - build-apps-with-krish RESET TRACE: `score_divergence` with the rejected history as `obvious`. Zero calls, and it fills the required pairwise-distance evidence.
   - krish-design fresh divergence: the engine may be **one** arm, fed only the sanitized brief. Embedding distance cannot certify that protocol's diversity, which is defined on sequencing, agency, interaction, information structure and state model, and its fresh-context judges stay.
3. **Output shape rule:** whatever the engine returns, the consuming skill reduces it to one recommendation. "Not a menu" holds.
4. **Do not wire into:** decision-ledger, verification-loop, council, take-the-brief, tools-access.

### 6. The rest

| Repo | Verdict | Where, if anywhere |
|---|---|---|
| higgsfield-generator | Fit | The thumbnail "Concept gate" (brainstorm at least five concepts) and faceless-video hooks: `provoke` with target `design` or `video`, before any generation spend. Put it in a wrapper skill of yours, not in the vendor files. |
| inspirationhouse | Supplier, not consumer | Its rejection floor and `not_for_us` cues become `cliches` and `bannedWords` for content-engine's namespaces. |
| humour-engine | Downstream partner | The engine generates comic variants; humour-engine checks whether they land. Never use the engine as its judge. |
| AEO-Engine | Weak fit | `score_divergence` on stage 60 recommendation angles against summaries of the first-cited pages, as a flag, not a filter. Questions a venture engine asked to track stay verbatim. Send de-identified text only (`docs/NEVER-PUBLISH.md`). |
| hunter | Weak fit | `score_divergence` on cover-letter hooks against generic openers. Its generation is anchored to your evidence on purpose. |
| mindmake (site) | Editorial only | `challenge` on proposed positioning, outside the 4-second visitor path. |
| growth-legibility, growth-fulltime | Later | Held engines propose nothing. Wire them only when released. |
| content-watcher, krish-clone | No | Model-free by North Star, or no creative step. |

## Phases

| Phase | What | Gate to start | Your decision needed |
|---|---|---|---|
| 0 (this week) | MCP server in Claude Code on your machine. Run Heartside and Mindmake U5 plays by hand. Seed both namespaces with `record_outputs`. | Met: benchmark passed | None beyond running it |
| 1 | Control Center route `POST /api/growth/engines/<slug>/divergent`, a copy of the humour route: Control Center's key, per-engine bearer, daily cap, metered under `divergent-<slug>`. Archive in Supabase. Synchronous `provoke`, `score`, `record`, `challenge`, `map`; `diverge` as an async job, since a full run can exceed a serverless time limit. | You approved at least one engine-made play in Phase 0 | Deploy, daily caps, the dollar ceiling per engine |
| 2 | Wire the growth engines' rule 5 to the route; content-engine wildcard and score guard; catalog entry. | Phase 1 live | Whether content-engine's paid calls count against the $15 chain |
| 3 | Skill hooks in ai-harness, higgsfield wrapper skill, the rest. | Phase 2 shows the tool is used | Harness admission rulings |

## Privacy

- The archive stores plain text.
- Several consuming repos are public.
- AEO-Engine and hunter handle prospect and employer names.

Send de-identified text only, keep the archive out of every repository, and record no names of real people.

## Next 24 to 72 hours

1. The benchmark passed (below), so no fallback is needed.
2. Register the MCP server on your machine: `claude mcp add divergent -- node /path/to/divergent-thinker/dist/mcp.js`, with your key in the environment.
3. Run `diverge` for Heartside's U5 plays with the order-loop plays as `cliches`, and for Mindmake's routes to meetings. Put the top play from each in front of you through the engines' normal proposal flow.
4. Count how many you approve. That number, not the benchmark, decides Phase 1.

## Counterpoints

- **This could be more building while the numbers sit at U5.** All five growth engines are stalled or unmeasured. The engine earns a place only if a play it produces gets approved and moves a number. Phase 0 is deliberately manual to test exactly that before any infrastructure.
- **The benchmark win is narrow.** The engine beat a well-written single call on distance from the consensus every time, but blind originality was a clear win on only one problem in three, and the sample is small. If Phase 0 approvals come mostly from `provoke`-grade ideas, keep `diverge` for rare occasions and lean on `provoke` and the zero-cost scorer.

## Benchmark result

**PASS, 3 of 3 problems, against the prompt-matched single call.** Live run, 18 November 2026, Opus 5.5. Raw results: [benchmarks/2026-11-18-three-arm.json](benchmarks/2026-11-18-three-arm.json).

Three arms per problem, five ideas each, pooled and scored by one blind judge against the same consensus map. The strong arm is one call given the same consensus as forbidden territory and all twelve lenses.

| Problem | Divergence score (engine / strong / naive) | Distance from consensus | Blind originality | Usefulness | Engine cost |
|---|---|---|---|---|---|
| Independent bakery vs supermarkets | **0.69** / 0.65 / 0.53 | **1.28** / 1.12 / 1.10 | 3.8 / 3.8 / 2.8 | 3.2 / 3.2 / 3.0 | $1.37, 29 calls |
| B2B churn | **0.72** / 0.67 / 0.56 | **1.32** / 1.18 / 1.11 | 3.8 / **4.0** / 2.6 | **3.6** / 3.4 / 3.8 | $0.95, 23 calls |
| Hooks on AI anxiety among senior leaders | **0.79** / 0.69 / 0.62 | **1.35** / 1.22 / 1.04 | **4.4** / 3.6 / 3.0 | 3.8 / 3.6 / 4.0 | $0.91, 23 calls |

**What it shows:**

- The engine's consistent advantage is distance from the consensus, on every problem, while judged usefulness held or rose against the strong arm.
- On blind-judged originality it is mixed against the strong arm: one tie, one small loss, one clear win (the video hooks, 4.4 against 3.6).
- A well-written single call already captures most of the gain over a naive prompt (originality 3.6 to 4.0 against 2.6 to 3.0). That is why `provoke`, which is essentially that call plus the gate and portfolio, is the default rung, and `diverge` is reserved for when it counts.
- A full `diverge` costs **$0.91 to $1.37 and 23 to 29 calls**, measured. That is roughly 7 to 9 times a `provoke`.

**Limits.**

- Three problems and five ideas each is a small sample.
- The judge made one pass, and it is the same model family as the generators.
- The "share outside the consensus" criterion did not discriminate: every arm scored 100%, so it passed as a tie.
- The divergence score includes distance, which the engine selects for directly, so it is not fully independent evidence. Blind originality is the independent axis.

**What it changes in this plan:** nothing in the ordering. It confirms the cost ladder. The real test is still Phase 0: whether you approve plays the engine produces.

**To strengthen it:** rerun on all five problems with two judge passes and a different-family judge (`DIVERGENT_MODEL_JUDGE`), and replace the binary outside-consensus criterion with mean distance.
