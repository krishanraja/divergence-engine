import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type { Embedder } from "./embed/embedder.js";
import { LENSES } from "./lenses.js";
import { sampleBeta } from "./util.js";

/**
 * Per-namespace memory. Two jobs:
 * 1. Never hand the same idea to the same consuming engine twice (novelty against history).
 * 2. Learn which lenses actually produce surviving ideas for this namespace (lens bandit).
 *
 * Plain files under DIVERGENT_HOME (default ~/.divergent). One directory per namespace.
 * Embeddings are stored with the embedder id and recomputed if the embedder changes.
 */
export interface ArchivedSpark {
  text: string;
  title: string;
  runId: string;
  ts: string;
  embedder: string;
  vector: number[];
}

export interface LensStats {
  alpha: number;
  beta: number;
}

export function divergentHome(): string {
  return process.env.DIVERGENT_HOME ?? path.join(homedir(), ".divergent");
}

function safeNamespace(ns: string): string {
  return ns.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "default";
}

/**
 * Where namespace memory lives. Files on the machine running the engine by default;
 * a host such as Control Center supplies its own (a database), so memory survives
 * ephemeral runners and is shared by every door into the engine.
 */
export interface MemoryStore {
  readonly id: string;
  loadSparks(namespace: string): Promise<ArchivedSpark[]>;
  appendSparks(namespace: string, entries: ArchivedSpark[]): Promise<void>;
  loadLensStats(namespace: string): Promise<Record<string, LensStats>>;
  saveLensStats(namespace: string, stats: Record<string, LensStats>): Promise<void>;
}

export class FileMemoryStore implements MemoryStore {
  readonly id = "file";
  constructor(private readonly root = divergentHome()) {}

  private dir(ns: string) {
    return path.join(this.root, safeNamespace(ns));
  }

  async loadSparks(ns: string): Promise<ArchivedSpark[]> {
    try {
      const raw = await readFile(path.join(this.dir(ns), "sparks.jsonl"), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as ArchivedSpark);
    } catch {
      return [];
    }
  }

  async appendSparks(ns: string, entries: ArchivedSpark[]): Promise<void> {
    if (!entries.length) return;
    await mkdir(this.dir(ns), { recursive: true });
    await appendFile(path.join(this.dir(ns), "sparks.jsonl"), entries.map((e) => JSON.stringify(e)).join("\n") + "\n");
  }

  async loadLensStats(ns: string): Promise<Record<string, LensStats>> {
    try {
      return JSON.parse(await readFile(path.join(this.dir(ns), "lenses.json"), "utf8"));
    } catch {
      return {};
    }
  }

  async saveLensStats(ns: string, stats: Record<string, LensStats>): Promise<void> {
    await mkdir(this.dir(ns), { recursive: true });
    await writeFile(path.join(this.dir(ns), "lenses.json"), JSON.stringify(stats, null, 2));
  }
}

/** In-memory store, for tests and for hosts that want no persistence. */
export class MemoryOnlyStore implements MemoryStore {
  readonly id = "memory";
  private readonly sparks = new Map<string, ArchivedSpark[]>();
  private readonly lenses = new Map<string, Record<string, LensStats>>();
  async loadSparks(ns: string) {
    return (this.sparks.get(ns) ?? []).map((s) => ({ ...s }));
  }
  async appendSparks(ns: string, entries: ArchivedSpark[]) {
    this.sparks.set(ns, [...(this.sparks.get(ns) ?? []), ...entries]);
  }
  async loadLensStats(ns: string) {
    return { ...(this.lenses.get(ns) ?? {}) };
  }
  async saveLensStats(ns: string, stats: Record<string, LensStats>) {
    this.lenses.set(ns, { ...stats });
  }
}

/** One namespace's memory for one run, over any store. */
export class Archive {
  sparks: ArchivedSpark[] = [];
  lenses: Record<string, LensStats> = {};
  private readonly store: MemoryStore;

  constructor(private readonly namespace: string, store: MemoryStore | string = new FileMemoryStore()) {
    this.store = typeof store === "string" ? new FileMemoryStore(store) : store;
  }

  async load(embedder: Embedder): Promise<void> {
    this.sparks = await this.store.loadSparks(this.namespace);
    const stale = this.sparks.filter((s) => s.embedder !== embedder.id || !Array.isArray(s.vector) || !s.vector.length);
    if (stale.length) {
      const vecs = await embedder.embed(stale.map((s) => s.text));
      stale.forEach((s, i) => {
        s.vector = vecs[i]!;
        s.embedder = embedder.id;
      });
    }
    this.lenses = await this.store.loadLensStats(this.namespace);
  }

  vectors(): number[][] {
    return this.sparks.map((s) => s.vector);
  }

  async remember(entries: Omit<ArchivedSpark, "ts">[]): Promise<void> {
    if (!entries.length) return;
    const ts = new Date().toISOString();
    const full = entries.map((e) => ({ ...e, ts }));
    await this.store.appendSparks(this.namespace, full);
    this.sparks.push(...full);
  }

  async saveLensStats(): Promise<void> {
    await this.store.saveLensStats(this.namespace, this.lenses);
  }
}

/**
 * Thompson-sampling lens selector. Each lens keeps a Beta(survived + 1, rejected + 1)
 * posterior. Each wave samples every lens and runs the highest draws, so lenses that
 * keep producing surviving ideas get chosen more, while weak lenses still get explored.
 */
export class LensBandit {
  constructor(private readonly stats: Record<string, LensStats>, private readonly rng: () => number) {
    for (const l of LENSES) this.stats[l.name] ??= { alpha: 1, beta: 1 };
  }

  choose(k: number, exclude: Set<string> = new Set()): string[] {
    const draws = LENSES.filter((l) => !exclude.has(l.name)).map((l) => {
      const s = this.stats[l.name]!;
      return { name: l.name, draw: sampleBeta(this.rng, s.alpha, s.beta) };
    });
    draws.sort((a, b) => b.draw - a.draw);
    return draws.slice(0, k).map((d) => d.name);
  }

  record(lens: string, survived: number, rejected: number): void {
    const s = (this.stats[lens] ??= { alpha: 1, beta: 1 });
    s.alpha += survived;
    s.beta += rejected;
  }
}
