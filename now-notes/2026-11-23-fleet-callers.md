# 2026-11-23: two new fleet callers

**Status:** `docs/WHEN-TO-USE.md` lists two new namespaces in the fleet table: `strategist` (`map` on a portfolio call, `challenge` on the lead recovery play) and `internal-auditor` (`score` only, free, to tell novel additions from rehashed instructions). Both call through the Control Center engine route as specialist engines. Docs only; no code changed.

**Next:** once both engines are registered in Control Center, record their first calls and mark the rows live with the pull request that wired them.

North Star check (2026-11-23): holds. More callers reach the engine, which can only raise the count of engine-made ideas Krish approves.
