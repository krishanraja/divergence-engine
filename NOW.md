---
as_of: 2026-11-18
---

# NOW: divergent-thinker

**What it is.** The fleet's divergent thinking engine. Other engines consult it when the default answer is not good enough: it maps the consensus, generates away from it, attacks the survivors, judges blind, and returns a few scored ideas that are far from the middle and from each other. It also scores any engine's outputs for how close they sit to the consensus or to what that engine already shipped.

## Where it is right now

<!-- north-star-state {"week_of":"2026-11-16","week_target":2,"current":2,"current_as_of":"2026-11-18","current_source":"docs/approvals.md, Krish's approvals of engine-made ideas","urgency":1,"urgency_reason":"first reading, which sets week one of the ladder"} --> **North Star number: U1, on pace.** Engine-made ideas Krish approves per week: 2 (week of 16 November, the first reading and week one of the ladder), on the way to 5 a week by 28 December 2026 (target confirmed). Both Phase 0 plays approved: Heartside realtor closing gifts, Mindmake dated miss report.

v0.1 on `main`. MCP server, HTTP API, CLI and library. 22 tests pass. The novelty gate is calibrated on real embeddings. A live run against the Claude API works end to end (`provoke`, about $0.15). The live benchmark passed 3 of 3 against a prompt-matched single call (18 November): further from the consensus every time, usefulness held, originality mixed. A full `diverge` costs about $1. Details in [docs/integration-plan.md](docs/integration-plan.md#benchmark-result).

**Docs.** [docs/WHEN-TO-USE.md](docs/WHEN-TO-USE.md) tells any session in any repository when and how to consult it; [docs/GUIDE.md](docs/GUIDE.md) goes deeper; [docs/ROADMAP.md](docs/ROADMAP.md) is the path to done.

**North Star (Ruling, Krish, 2026-11-18).** Engine-made ideas Krish approves per week across the fleet ([docs/NORTH_STAR.md](docs/NORTH_STAR.md)). Counted in [docs/approvals.md](docs/approvals.md).

**Next.** Krish gives each approved play to its engine as his instruction in Control Center (the texts are in `now-notes/2026-11-18-phase0.md`). Then measure whether either play produces an order or a good meeting. Two approvals in week one meets the bar to start Phase 1, the Control Center route.

**Live (18 November).** Control Center hosts it (control-center#963 merged, migration applied). All four consumers are on main: growth-heartside, growth-mindmake, growth-makeyourmindup and content-engine, each with an at-will command. The canon sentence and four skill lines are admitted (ai-harness#284). The gate calibrates itself on the first `divergent_score` call against Control Center's embedder.

**Waiting on Krish.**
- Revoke the API key used for the 18 November benchmark run (he is doing this).
