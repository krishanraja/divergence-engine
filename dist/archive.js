import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { LENSES } from "./lenses.js";
import { sampleBeta } from "./util.js";
export function divergentHome() {
    return process.env.DIVERGENT_HOME ?? path.join(homedir(), ".divergent");
}
function safeNamespace(ns) {
    return ns.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "default";
}
export class FileMemoryStore {
    root;
    id = "file";
    constructor(root = divergentHome()) {
        this.root = root;
    }
    dir(ns) {
        return path.join(this.root, safeNamespace(ns));
    }
    async loadSparks(ns) {
        try {
            const raw = await readFile(path.join(this.dir(ns), "sparks.jsonl"), "utf8");
            return raw
                .split("\n")
                .filter(Boolean)
                .map((l) => JSON.parse(l));
        }
        catch {
            return [];
        }
    }
    async appendSparks(ns, entries) {
        if (!entries.length)
            return;
        await mkdir(this.dir(ns), { recursive: true });
        await appendFile(path.join(this.dir(ns), "sparks.jsonl"), entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
    }
    async loadLensStats(ns) {
        try {
            return JSON.parse(await readFile(path.join(this.dir(ns), "lenses.json"), "utf8"));
        }
        catch {
            return {};
        }
    }
    async saveLensStats(ns, stats) {
        await mkdir(this.dir(ns), { recursive: true });
        await writeFile(path.join(this.dir(ns), "lenses.json"), JSON.stringify(stats, null, 2));
    }
}
/** In-memory store, for tests and for hosts that want no persistence. */
export class MemoryOnlyStore {
    id = "memory";
    sparks = new Map();
    lenses = new Map();
    async loadSparks(ns) {
        return (this.sparks.get(ns) ?? []).map((s) => ({ ...s }));
    }
    async appendSparks(ns, entries) {
        this.sparks.set(ns, [...(this.sparks.get(ns) ?? []), ...entries]);
    }
    async loadLensStats(ns) {
        return { ...(this.lenses.get(ns) ?? {}) };
    }
    async saveLensStats(ns, stats) {
        this.lenses.set(ns, { ...stats });
    }
}
/** One namespace's memory for one run, over any store. */
export class Archive {
    namespace;
    sparks = [];
    lenses = {};
    store;
    constructor(namespace, store = new FileMemoryStore()) {
        this.namespace = namespace;
        this.store = typeof store === "string" ? new FileMemoryStore(store) : store;
    }
    async load(embedder) {
        this.sparks = await this.store.loadSparks(this.namespace);
        const stale = this.sparks.filter((s) => s.embedder !== embedder.id || !Array.isArray(s.vector) || !s.vector.length);
        if (stale.length) {
            const vecs = await embedder.embed(stale.map((s) => s.text));
            stale.forEach((s, i) => {
                s.vector = vecs[i];
                s.embedder = embedder.id;
            });
        }
        this.lenses = await this.store.loadLensStats(this.namespace);
    }
    vectors() {
        return this.sparks.map((s) => s.vector);
    }
    async remember(entries) {
        if (!entries.length)
            return;
        const ts = new Date().toISOString();
        const full = entries.map((e) => ({ ...e, ts }));
        await this.store.appendSparks(this.namespace, full);
        this.sparks.push(...full);
    }
    async saveLensStats() {
        await this.store.saveLensStats(this.namespace, this.lenses);
    }
}
/**
 * Thompson-sampling lens selector. Each lens keeps a Beta(survived + 1, rejected + 1)
 * posterior. Each wave samples every lens and runs the highest draws, so lenses that
 * keep producing surviving ideas get chosen more, while weak lenses still get explored.
 */
export class LensBandit {
    stats;
    rng;
    constructor(stats, rng) {
        this.stats = stats;
        this.rng = rng;
        for (const l of LENSES)
            this.stats[l.name] ??= { alpha: 1, beta: 1 };
    }
    choose(k, exclude = new Set()) {
        const draws = LENSES.filter((l) => !exclude.has(l.name)).map((l) => {
            const s = this.stats[l.name];
            return { name: l.name, draw: sampleBeta(this.rng, s.alpha, s.beta) };
        });
        draws.sort((a, b) => b.draw - a.draw);
        return draws.slice(0, k).map((d) => d.name);
    }
    record(lens, survived, rejected) {
        const s = (this.stats[lens] ??= { alpha: 1, beta: 1 });
        s.alpha += survived;
        s.beta += rejected;
    }
}
//# sourceMappingURL=archive.js.map