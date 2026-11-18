---
as_of: 2026-11-18
---

# NOW: divergent-thinker

**What it is.** The fleet's divergent thinking engine. Other engines consult it when the default answer is not good enough: it maps the consensus, generates away from it, attacks the survivors, judges blind, and returns a few scored ideas that are far from the middle and from each other. It also scores any engine's outputs for how close they sit to the consensus or to what that engine already shipped.

## Where it is right now

<!-- north-star-state {"week_of":"2026-11-16","week_target":null,"current":null,"current_as_of":null,"current_source":null,"urgency":4,"urgency_reason":"not measured yet; ladder pending its first reading"} --> **North Star number: U4, not measured.** Engine-made ideas Krish approves per week: not measured yet, ladder pending its first reading, on the way to 5 a week by 28 December 2026 (target proposed). Measuring it comes first: the Phase 0 plays for Heartside and Mindmake are its first reading.

v0.1 on `main`. MCP server, HTTP API, CLI and library. 22 tests pass. The novelty gate is calibrated on real embeddings. A live run against the Claude API works end to end (`provoke`, about $0.15). The live benchmark passed 3 of 3 against a prompt-matched single call (18 November): further from the consensus every time, usefulness held, originality mixed. A full `diverge` costs about $1. Details in [docs/integration-plan.md](docs/integration-plan.md#benchmark-result).

**North Star (Ruling, Krish, 2026-11-18).** Engine-made ideas Krish approves per week across the fleet ([docs/NORTH_STAR.md](docs/NORTH_STAR.md)). Counted in [docs/approvals.md](docs/approvals.md).

**Next.** Run `diverge` by hand for Heartside's U5 recovery plays and Mindmake's routes to meetings, from a Claude Code session with the MCP server registered, and put the top play from each through the engines' normal proposal flow. Count approvals. That count decides whether to build the Control Center route (Phase 1 of the integration plan).

**Waiting on Krish.**
- Confirm the North Star's target and deadline (proposed: 5 a week by 28 December 2026).
- Revoke the API key used for the 18 November benchmark run. It was shared in a chat transcript.
