# divergent-thinker

A divergent thinking engine your other engines consult when the default answer is not good enough.

It maps what everyone else will say, forces generation away from it through cognitive lenses, attacks the survivors adversarially, judges them blind, and returns a small, mutually different portfolio of scored ideas. Each idea comes with its lineage, the conventional idea it beats, and a ready-to-run prompt for the engine that will build it.

It also works the other way round, as a critic: send it any engine's output and it tells you how far that output sits from the consensus, and from what that engine has produced before.

## Why this exists

Ask a model to "be creative" and you get the centre of the distribution, reworded. Three reasons, and what the engine does about each:

| Failure | Mechanism | Countermeasure |
|---|---|---|
| Mode collapse | The model's first answers are its most probable ones. | **Consensus probe.** The first call asks for the obvious answers on purpose. They become forbidden territory and the measuring stick for everything after. |
| No sampling knob | Current Claude models reject `temperature`, so you cannot buy variety with randomness. | **Prompt-level perturbation.** Twelve lenses, each fed a seeded random stimulus (a remote domain, an absurd constraint, an extreme user, an orthodoxy to invert). |
| Degeneration of thought | A model asked to improve its own idea drifts back toward safety, and dialectical "synthesis" splits the difference with the mainstream. | **Separate adversary, plus a regression guard.** A mutation that moved closer to the consensus than its thesis is thrown away and the thesis kept. |

## Pipeline

```
problem
  -> 1. probe       what most people and models say first + the assumptions they share
  -> 2. diverge     waves of lens calls; a Thompson-sampling bandit picks the lenses
  -> 3. gate        self-calibrating semantic distance from consensus, archive, siblings
  -> 4. dialectic   adversary finds the conventional twin + fatal flaw + a rival idea;
                    synthesizer mutates; regression guard; the rival idea is gated too
  -> 5. judge       blind, AUT-style rubric (originality, usefulness, specificity),
                    two shuffled passes averaged to cut position bias; usefulness floor
  -> 6. select      weighted geometric mean score + maximal-marginal-relevance portfolio
  -> 7. hybrid      one cross-pollinated blend of the two most complementary sparks
  -> sparks + downstream prompts + full thought graph
```

Every idea is a node in a DAG with parents, so a mutation points to its thesis and a hybrid to both of its parents.

### The novelty gate, and how it was calibrated

Fixed thresholds such as "cosine distance above 0.65" break when the embedder, domain or problem changes. The gate calibrates per run instead: the consensus answers form a cluster, their median nearest-neighbour distance is the *spread*, and a candidate must sit at least `spread x factor` from every consensus answer. Duplicates are anything within half a spread of an accepted idea or an archived one.

The factors are measured, not guessed. `npm run calibrate` runs three problems with 15 rewordings of consensus answers (must be rejected) and 15 genuinely non-obvious ideas that reuse the topic's vocabulary (must pass). With the default local embedder:

| Temperament | Rewordings rejected | Non-obvious accepted | Distinct pairs flagged duplicate |
|---|---|---|---|
| grounded | 14/15 | 15/15 | 0/30 |
| balanced | 15/15 | 15/15 | 0/30 |
| wild | 15/15 | 12/15 | 0/30 |

The first factor I tried (1.0) rejected half of the good ideas. The measurement is what fixed it. Caveat: 30 hand-written ideas from one author is a small set. Extend `bench/calibrate.mts` with real outputs from your engines before trusting the factors on a new domain.

The lexical fallback embedder (used only if the local model cannot load) catches about half of paraphrased rewordings, and the engine warns when it falls back.

### Scoring

`score = weighted geometric mean(remoteness, originality, usefulness, specificity)`

Geometric on purpose: a remote but useless idea, or a useful but conventional one, cannot be rescued by excelling on one axis. Temperament changes the weights and the usefulness floor: `grounded` weights usefulness, `wild` weights originality and remoteness.

## What the reference repos actually do, and what this engine takes from them

Each repo was cloned and read at the source level (README, core modules, prompts, and published findings). Several descriptions in the original architecture brief did not match the code, and those corrections changed the design.

| Repo | What it actually is | What this engine takes | Where the brief was wrong |
|---|---|---|---|
| `nachosystems/deep-thinker` (published as `hubinoretros/deep-thinker`) | A TypeScript MCP server that stores a thought DAG and ten strategy schemas. It makes **no model calls**: the host model does the thinking. Stagnation is detected when self-reported confidence stops improving (`src/core/metacog.ts`). | The DAG with parents and cross-edges, the strategy menu, and switching strategy on stagnation. | The brief described stagnation as "depth without semantic variance". Here stagnation is measured directly as the share of a lens's ideas that survive the gate, and a Thompson-sampling bandit learns lens yield per namespace across runs. |
| `Skytliang/Multi-Agents-Debate` | A **convergence** framework: an affirmative and a negative debater plus a moderator who ends the debate early once one side clearly wins, up to three rounds, aimed at counterintuitive QA and translation (`code/debate4tran.py`, `config4all.json`). | Its diagnosis of degeneration of thought, and the remedy of a separate agent whose job is to disagree. | MAD is built to reach one correct answer, not to widen the option set. The engine uses one attack per thesis and turns the adversary's rival proposal into a candidate idea of its own. |
| `FradSer/dialectica` | An evaluated reasoning-workflow toolbox. Its own ablations found that ToT+GAN beam search, the ensemble scorer, and an untuned dialectic spiral **tied or lost to a prompt-matched single call** on self-contained tasks. On open-ended tasks the gain came from **mixing heterogeneous models**, and the dialectic only won (three tasks, one judge) once its synthesis prompt was sharpened to make one binding decision (README findings 2, 3, 5, 7 and 9). | Three things, all from its evidence: the benchmark control is a prompt-matched single call, not a naive prompt; the synthesis prompt makes one binding decision and names where the objection still wins; and any role can rotate through a roster of models. | The brief presented dialectica's tree search and GAN critic as the refinement layer. Its author demoted exactly those components. The dialectic stage here should be treated as unproven until `npm run bench` says otherwise. |
| `massivetexts/llm_aut_study` | Notebooks for Organisciak et al. (2022). Models fine-tuned on 27,000 human-rated **Alternate Uses Task** responses reached r = 0.81 with human raters. **Semantic distance reached only r = 0.12 to 0.26.** Learning transferred to new AUT items, sometimes with no training at all. | A prompted LLM judge on an AUT-style originality rubric, with the consensus answers as anchors for a score of 1. | The scorer itself is AUT-specific (uses for everyday objects), so it is not shipped. More importantly, the paper's own numbers say embedding distance is a weak stand-in for originality. Here distance only gates rewordings, which calibration shows it does well; originality is the judge's job, and the score is geometric so neither signal can carry an idea alone. |
| `lechmazur/divergent` | A word-level benchmark: generate 25 words unrelated to each other and to 50 given words. Every pair is rated for relatedness 0 to 10 by **four LLM judges**, not embeddings; each word scores by its minimum divergence from the others; rule-following and repeats across 88 prompts are tracked separately. | Scoring an item by its nearest neighbour (minimum divergence), an explicit anchor list to stay away from, and tracking repetition across runs (the namespace archive). | The brief described cosine distance. The benchmark uses LLM judges because they catch connections embeddings miss (wordplay, sound, theme). The engine uses embeddings for speed, so the adversary's "conventional twin" check is the LLM backstop for disguised consensus answers. |

## Interfaces

All four share one engine.

### MCP (Claude Code, Claude Desktop, any MCP host)

```bash
npm install && npm run build
claude mcp add divergent -e ANTHROPIC_API_KEY=... -- node /absolute/path/to/divergent-thinker/dist/mcp.js
```

| Tool | Calls | Use |
|---|---|---|
| `diverge` | about 25 to 40 | Full run. Before committing to an approach. |
| `provoke` | 2 | Cheap, frequent inspiration. |
| `map_consensus` | 1 | See the default before deciding whether to diverge. |
| `score_divergence` | 0 to 2 | Measure any engine's outputs. Zero calls when you pass `obvious`. |
| `challenge` | 3 | Attack an existing idea or plan and return a stronger, further-out mutation. |
| `list_lenses` | 0 | The twelve lenses. |

### HTTP (n8n, edge functions, scripts)

```bash
DIVERGENT_TOKEN=choose-a-token npm run serve   # 127.0.0.1:8787
curl -H "Authorization: Bearer choose-a-token" -X POST localhost:8787/provoke \
  -d '{"problem":"Hooks for a video about AI anxiety among senior leaders","namespace":"video-engine","target":"video"}'
```

Routes: `POST /diverge`, `/provoke`, `/map`, `/score`, `/challenge`, `GET /health`.

### CLI

```bash
node dist/cli.js "How can an independent bakery compete with supermarkets?"
node dist/cli.js --mode provoke --target video --namespace video-engine "Hooks for a video about AI anxiety"
node dist/cli.js --mode challenge --idea "Launch a weekly newsletter" "Grow an audience for an AI consultancy"
node dist/cli.js --mode score --ideas outputs.json "the problem those outputs answer"
```

### Library

```ts
import { createEngine } from "divergent-thinker";
const engine = await createEngine();
const report = await engine.run({ problem, namespace: "content-engine", target: "writing", count: 5 });
```

## Configuration

| Variable | Default | Effect |
|---|---|---|
| `ANTHROPIC_API_KEY` | none | Required for any call that generates. Scoring with a supplied consensus needs no key. |
| `DIVERGENT_MODEL` | `claude-opus-5-5` | Model for every role. |
| `DIVERGENT_MODEL_<ROLE>` | | Per-role override: `PROBE`, `DIVERGE`, `ADVERSARY`, `SYNTHESIZE`, `JUDGE`, `BLEND`, `PROVOKE`. A comma-separated list is a roster the role rotates through, e.g. `DIVERGENT_MODEL_DIVERGE=claude-opus-5-5,claude-sonnet-5-5`. |
| `DIVERGENT_EMBEDDER` | `local` | `local` (MiniLM, downloads about 23 MB once), `lexical`, or a Hugging Face model id. |
| `DIVERGENT_HOME` | `~/.divergent` | Per-namespace memory: handed-out ideas and lens statistics. |
| `DIVERGENT_DISABLE_FALLBACKS` | | `1` turns off server-side refusal fallbacks. |
| `DIVERGENT_TOKEN`, `DIVERGENT_PORT`, `DIVERGENT_HOST` | | HTTP server auth and binding. |

Run options (MCP, HTTP, library): `count`, `temperament` (`grounded` / `balanced` / `wild`), `target` (`generic`, `code`, `writing`, `research`, `strategy`, `design`, `video`, `product`), `cliches`, `bannedWords`, `lenses`, `namespace`, `maxCalls` (hard ceiling, default 40), `seed`, `dialecticRounds`, `judgePasses`, `crossPollinate`, `remember`.

**Cost.** Unmeasured until the live benchmark runs. Estimate for a default `diverge` on Opus 5.5: roughly 30 to 40 calls, on the order of $1 to $3. `provoke` is two calls. The call ceiling is enforced before every call, and every report includes `usage` with token counts and estimated cost. A cheaper judge is one variable away: `DIVERGENT_MODEL_JUDGE=claude-sonnet-5-5`.

## Verification status

| Check | Status |
|---|---|
| Typecheck and build | Pass |
| 21 unit and pipeline tests with a scripted model (gate, regression guard, budget ceiling, usefulness floor, namespace memory, provoke, score, challenge, bandit, MMR) | Pass |
| Gate calibration with the real embedder (`npm run calibrate`) | Pass, table above |
| MCP server over stdio: tool listing, zero-call scoring, clean error without a key | Pass |
| HTTP server: health, auth, validation, zero-call scoring | Pass |
| Anthropic request shape (model, effort, structured output schema, refusal fallbacks, prompt caching, no sampling params), checked against a captured request | Pass |
| Model roster rotation, checked on the wire | Pass |
| **Live benchmark against a prompt-matched single call** (`npm run bench`) | **Not run.** No API key in the build environment. Three arms (naive prompt, prompt-matched strong single call, engine), scored on one yardstick with pooled blind judging. Pass signal is set in advance in `bench/bench.mts`: the engine must beat the **strong** arm on mean divergence score and share outside the consensus on most problems, without losing more than 0.5 judged usefulness. |

Until the benchmark runs, the claim that the engine beats a single call is a hypothesis with a defined test, not a result. dialectica's evidence makes a loss to the strong arm a real possibility. If that happens, the ranked fallbacks are: switch the generator to a heterogeneous roster, then cut the dialectic stage, then keep only `provoke` and `score_divergence`.

## Development

```bash
npm test            # scripted model, no spend
npm run calibrate   # real embedder, no spend
npm run bench       # live, spends tokens: naive vs prompt-matched single call vs engine
```
