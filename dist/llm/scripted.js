/**
 * Deterministic provider driven by per-role handlers. Used by the test suite and
 * for dry runs that exercise the full pipeline without spending tokens.
 * Every reply is validated against the request schema, exactly as the real API enforces.
 */
export class ScriptedProvider {
    handlers;
    name = "scripted";
    log = [];
    n = 0;
    constructor(handlers) {
        this.handlers = handlers;
    }
    async structured(req) {
        const handler = this.handlers[req.role];
        if (!handler)
            throw new Error(`ScriptedProvider has no handler for role ${req.role}`);
        this.log.push({ role: req.role, user: req.user });
        const raw = handler(req, this.n++);
        const data = req.schema.parse(raw);
        return { data, usage: { inputTokens: 0, outputTokens: 0, model: "scripted" } };
    }
    cost(_usage) {
        return 0;
    }
}
//# sourceMappingURL=scripted.js.map