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

/**
 * Local sentence embeddings (all-MiniLM-L6-v2, quantized) via transformers.js.
 * No API key; the model downloads once from Hugging Face (about 23 MB) and is cached.
 */
export class LocalEmbedder implements Embedder {
  readonly id: string;
  private extractor: Promise<(texts: string[], opts: object) => Promise<{ tolist(): number[][] }>> | null = null;

  constructor(private readonly model = "Xenova/all-MiniLM-L6-v2") {
    this.id = `local:${model}`;
  }

  private load() {
    if (!this.extractor) {
      this.extractor = (async () => {
        const mod = (await import("@huggingface/transformers")) as unknown as {
          pipeline: (task: string, model: string, opts: object) => Promise<never>;
        };
        return mod.pipeline("feature-extraction", this.model, { dtype: "q8" });
      })();
    }
    return this.extractor;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const extract = await this.load();
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 32) {
      const batch = texts.slice(i, i + 32);
      const t = await extract(batch, { pooling: "mean", normalize: true });
      out.push(...t.tolist());
    }
    return out;
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
 * Picks the best available embedder. DIVERGENT_EMBEDDER=lexical forces the fallback.
 * If the local model fails to load, the run continues on the lexical embedder and says so.
 */
export async function createEmbedder(
  preference: string | undefined = process.env.DIVERGENT_EMBEDDER,
  onWarning?: (msg: string) => void,
): Promise<Embedder> {
  if (preference === "lexical") return new CachedEmbedder(new LexicalEmbedder());
  const local = new LocalEmbedder(preference && preference !== "local" ? preference : undefined);
  try {
    await local.embed(["warmup"]);
    return new CachedEmbedder(local);
  } catch (err) {
    onWarning?.(
      `Local embedding model unavailable (${(err as Error).message}). Falling back to lexical distance, which cannot see paraphrase.`,
    );
    return new CachedEmbedder(new LexicalEmbedder());
  }
}
