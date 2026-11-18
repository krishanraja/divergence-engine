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

export class Archive {
  private readonly dir: string;
  sparks: ArchivedSpark[] = [];
  lenses: Record<string, LensStats> = {};

  constructor(namespace: string, root = divergentHome()) {
    this.dir = path.join(root, safeNamespace(namespace));
  }

  async load(embedder: Embedder): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    try {
      const raw = await readFile(path.join(this.dir, "sparks.jsonl"), "utf8");
      this.sparks = raw
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l) as ArchivedSpark);
    } catch {
      this.sparks = [];
    }
    const stale = this.sparks.filter((s) => s.embedder !== embedder.id);
    if (stale.length) {
      const vecs = await embedder.embed(stale.map((s) => s.text));
      stale.forEach((s, i) => {
        s.vector = vecs[i]!;
        s.embedder = embedder.id;
      });
    }
    try {
      this.lenses = JSON.parse(await readFile(path.join(this.dir, "lenses.json"), "utf8"));
    } catch {
      this.lenses = {};
    }
  }

  vectors(): number[][] {
    return this.sparks.map((s) => s.vector);
  }

  async remember(entries: Omit<ArchivedSpark, "ts">[]): Promise<void> {
    if (!entries.length) return;
    const ts = new Date().toISOString();
    const lines = entries.map((e) => JSON.stringify({ ...e, ts })).join("\n") + "\n";
    await appendFile(path.join(this.dir, "sparks.jsonl"), lines);
    this.sparks.push(...entries.map((e) => ({ ...e, ts })));
  }

  async saveLensStats(): Promise<void> {
    await writeFile(path.join(this.dir, "lenses.json"), JSON.stringify(this.lenses, null, 2));
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
