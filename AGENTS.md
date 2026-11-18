# AGENTS.md

<!-- north-star:start -->
## North Star: read it first, every session

This repository's North Star is [`docs/NORTH_STAR.md`](docs/NORTH_STAR.md): engine-made ideas Krish approves per week, across the fleet.

- Read it before any work, every session, and say which part of it the task moves. If it moves nothing, say so first and let Krish decide.
- Check the state line, the first line under "Where it is right now" in `NOW.md`, and push at the intensity [the harness contract](https://github.com/krishanraja/ai-harness/blob/main/contract/north-star-metric.md) sets for its urgency.
- Only Krish changes it.
<!-- north-star:end -->

Read `NOW.md` first, then `README.md` and `docs/GUIDE.md`. Before a session that changed the repository ends, write `now-notes/YYYY-MM-DD-<slug>.md` with `Status:`, `Next:` and a dated North Star check line.

## Rules

1. **This repository is public.** No credential, secret name, customer data or real person's name in code, docs, fixtures, benchmark results or commits. The namespace archive lives outside the repository (`DIVERGENT_HOME`).
2. **Measured, not asserted.** A claim about quality, cost or calibration in the docs points at a script that reproduces it (`npm run calibrate`, `npm run bench`) or a saved result under `docs/benchmarks/`. A number never measured is labelled an estimate.
3. **The engine proposes; it never sends, posts or spends on anyone's behalf.** Its output goes into the consuming engine's own approval flow.
4. **Model calls have a hard ceiling per run** (`maxCalls`). A change that adds calls says what it costs, measured.
5. **No em dashes, no hype words** in docs or prompts (the generator's own kill list is in `src/prompts.ts`).
6. **Checks before pushing:** `npm run typecheck`, `npm test`, and `npm run calibrate` after any change to the gate or the embedder.
