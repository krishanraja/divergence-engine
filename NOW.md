---
as_of: 2026-11-18
---

# NOW: divergent-thinker

**What it is.** The fleet's divergent thinking engine. Other engines consult it when the default answer is not good enough: it maps the consensus, generates away from it, attacks the survivors, judges blind, and returns a few scored ideas that are far from the middle and from each other. It also scores any engine's outputs for how close they sit to the consensus or to what that engine already shipped.

**Where it is right now.** v0.1 on `main`. MCP server, HTTP API, CLI and library. 22 tests pass. The novelty gate is calibrated on real embeddings. A live run against the Claude API works end to end (`provoke`, about $0.15). The prompt-matched benchmark result is in [docs/integration-plan.md](docs/integration-plan.md).

**North Star (proposed, not set: Krish sets it).** Engine-made ideas Krish approves per week across the fleet. The engine earns its place only when its ideas get approved and move a venture's number.

**Next.** Run `diverge` by hand for Heartside's U5 recovery plays and Mindmake's routes to meetings, from a Claude Code session with the MCP server registered, and put the top play from each through the engines' normal proposal flow. Count approvals. That count decides whether to build the Control Center route (Phase 1 of the integration plan).

**Waiting on Krish.**
- Set the North Star, or replace the proposed one.
- Revoke the API key used for the 18 November benchmark run. It was shared in a chat transcript.
- Switch the GitHub default branch to `main` (Settings, then Default branch).
