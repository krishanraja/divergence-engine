# 2026-11-24: the package is divergence-engine

**Status:** the package and canon name is `divergence-engine` (package.json, package-lock.json, the MCP server name, the HTTP startup line, the CLI usage line, README, GUIDE, WHEN-TO-USE and the integration plan). New commands `divergence-engine` and `divergence-engine-mcp` sit beside the old `divergent` and `divergent-mcp`, which stay. Control Center pins a tarball under the dependency key `divergent-thinker`, and npm installs it under that key whatever the package calls itself (checked with npm pack and install), so nothing breaks until the pin is bumped. The proposal evidence label stays `divergent-thinker spark <id>, run <run>`, because Control Center counts this engine's North Star with a pattern on that exact text. History (ROADMAP's done phases, older now-notes, NOW.md) is left as it was.

**Next:** when Control Center next bumps its pin, move its dependency key and its `divergent-thinker/core` imports to `divergence-engine`, and let its spark count accept the label under both names before any label changes.

North Star check (2026-11-24): holds. The count of engine-made ideas Krish approves is untouched, because the label it is counted by is kept.
