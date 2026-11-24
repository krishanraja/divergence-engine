#!/usr/bin/env node
/**
 * Minimal HTTP API for engines that are not MCP hosts (n8n, edge functions, scripts).
 *
 *   POST /diverge          body: RunOptions          -> compact report
 *   POST /provoke          body: { problem, ... }    -> compact report
 *   POST /map              body: { problem, context } -> consensus map
 *   POST /score            body: { problem, ideas, obvious?, judge? }
 *   POST /challenge        body: { problem, idea, namespace? }
 *   POST /record           body: { namespace, items: string[], label? }  (zero model calls)
 *   GET  /health
 *
 * Set DIVERGENT_TOKEN to require "Authorization: Bearer <token>". Binds to 127.0.0.1
 * unless DIVERGENT_HOST says otherwise.
 */
import { createServer } from "node:http";
import { createEngine } from "./index.js";
import { compactReport } from "./views.js";
const port = Number(process.env.PORT ?? process.env.DIVERGENT_PORT ?? 8787);
const host = process.env.DIVERGENT_HOST ?? "127.0.0.1";
const token = process.env.DIVERGENT_TOKEN;
let enginePromise = null;
const engine = () => (enginePromise ??= createEngine({ onWarning: (m) => console.error(`[divergent] ${m}`) }));
async function body(req) {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
        size += c.length;
        if (size > 1_000_000)
            throw new Error("body too large");
        chunks.push(c);
    }
    return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}
function send(res, status, data) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
}
const server = createServer(async (req, res) => {
    try {
        if (req.method === "GET" && req.url === "/health")
            return send(res, 200, { ok: true });
        if (token && req.headers.authorization !== `Bearer ${token}`)
            return send(res, 401, { error: "unauthorized" });
        if (req.method !== "POST")
            return send(res, 405, { error: "POST only" });
        const b = await body(req);
        const e = await engine();
        if (req.url === "/record") {
            if (typeof b.namespace !== "string" || !Array.isArray(b.items))
                return send(res, 400, { error: "namespace and items are required" });
            return send(res, 200, await e.record(b));
        }
        if (typeof b.problem !== "string" || !b.problem.trim())
            return send(res, 400, { error: "problem is required" });
        switch (req.url) {
            case "/diverge":
                return send(res, 200, compactReport(await e.run(b)));
            case "/provoke":
                return send(res, 200, compactReport(await e.provoke(b)));
            case "/map":
                return send(res, 200, await e.mapConsensus(b.problem, b.context));
            case "/score":
                if (!Array.isArray(b.ideas))
                    return send(res, 400, { error: "ideas must be an array" });
                return send(res, 200, await e.score(b));
            case "/challenge":
                if (!b.idea)
                    return send(res, 400, { error: "idea is required" });
                return send(res, 200, await e.challenge(b));
            default:
                return send(res, 404, { error: "not found" });
        }
    }
    catch (err) {
        console.error(err);
        return send(res, 500, { error: err.message });
    }
});
server.listen(port, host, () => console.error(`divergence-engine listening on http://${host}:${port}`));
//# sourceMappingURL=http.js.map