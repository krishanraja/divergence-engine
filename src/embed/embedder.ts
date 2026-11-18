/**
 * Embedders turn idea text into vectors so the engine can measure distance from the
 * consensus, from past outputs, and between siblings.
 *
 * The novelty gate is self-calibrating (see stages/gate.ts), so it works with any
 * embedder whose distances are monotone in meaning. Absolute scales never matter.
 */
export interface Embedder {
  readonly id: string;
  embed(texts: string[]): Promise<number[][]>;
}

/** Memoizes vectors by exact text. Ideas get re-measured many times per run. */
export class CachedEmbedder implements Embedder {
  private readonly cache = new Map<string, number[]>();
  constructor(private readonly inner: Embedder) {}

  get id(): string {
    return this.inner.id;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const missing = [...new Set(texts.filter((t) => !this.cache.has(t)))];
    if (missing.length) {
      const vecs = await this.inner.embed(missing);
      missing.forEach((t, i) => this.cache.set(t, vecs[i]!));
    }
    return texts.map((t) => this.cache.get(t)!);
  }
}

const STOP = new Set(
  "a an the and or but of to in on for with by from at as is are be been was were it its this that these those into via using use uses your their our we you they them can will would should could may might not no more most less very just than then so such each any all some one two new".split(
    " ",
  ),
);

/**
 * Dependency-free fallback: hashed word unigrams, bigrams and character 4-grams.
 * Captures lexical overlap only, so it catches rewordings and shared vocabulary but not
 * paraphrase. Used when the local model cannot load, and in tests for speed.
 */
export class LexicalEmbedder implements Embedder {
  readonly id = "lexical:hash-1024";
  constructor(private readonly dim = 1024) {}

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vector(t));
  }

  private vector(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map(stem);
    const add = (feature: string, weight: number) => {
      v[hash(feature) % this.dim]! += weight;
    };
    words.forEach((w, i) => {
      add(`w:${w}`, 1);
      if (i > 0) add(`b:${words[i - 1]}_${w}`, 0.7);
      const padded = ` ${w} `;
      for (let j = 0; j + 4 <= padded.length; j++) add(`c:${padded.slice(j, j + 4)}`, 0.25);
    });
    for (let i = 0; i < v.length; i++) v[i] = Math.sign(v[i]!) * Math.log1p(Math.abs(v[i]!));
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }
}

function stem(w: string): string {
  return w.replace(/(ingly|edly|ing|ed|ies|es|s|ly)$/, "") || w;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * OpenAI text-embedding-3-small over HTTPS. Used where a local model cannot run
 * (serverless hosts such as Control Center, whose function size limit rules out the
 * local runtime). The key is passed in by the host, never read from a file.
 */
export class OpenAIEmbedder implements Embedder {
  readonly id: string;
  constructor(
    private readonly key: string,
    private readonly model = "text-embedding-3-small",
    private readonly fetcher: typeof fetch = fetch,
  ) {
    this.id = `openai:${model}`;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 96) {
      const batch = texts.slice(i, i + 96).map((t) => t.trim().slice(0, 6000) || " ");
      const r = await this.fetcher("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: this.model, input: batch }),
      });
      if (!r.ok) throw new Error(`openai embeddings failed: ${r.status}`);
      const data = (await r.json()) as { data: Array<{ index: number; embedding: number[] }> };
      const sorted = data.data.slice().sort((a, b) => a.index - b.index);
      out.push(...sorted.map((d) => d.embedding));
    }
    return out;
  }
}
