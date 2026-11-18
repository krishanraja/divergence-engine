/** Small deterministic helpers shared across stages. */

/** Mulberry32: tiny, fast, seedable PRNG. Good enough for sampling, not crypto. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("pick from empty list");
  return items[Math.floor(rng() * items.length)]!;
}

export function shuffle<T>(rng: () => number, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Beta(a, b) sample via two gamma draws (Marsaglia and Tsang). */
export function sampleBeta(rng: () => number, a: number, b: number): number {
  const x = sampleGamma(rng, a);
  const y = sampleGamma(rng, b);
  return x / (x + y);
}

function sampleGamma(rng: () => number, shape: number): number {
  if (shape < 1) {
    return sampleGamma(rng, shape + 1) * Math.pow(rng() || 1e-12, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = gaussian(rng);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rng() || 1e-12;
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function gaussian(rng: () => number): number {
  const u = rng() || 1e-12;
  const v = rng() || 1e-12;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Cosine distance clipped to [0, 1]. Negative similarity counts as fully distant. */
export function distance(a: number[], b: number[]): number {
  return Math.min(1, Math.max(0, 1 - cosine(a, b)));
}

/** Smallest distance from v to any vector in set. Returns 1 for an empty set. */
export function nearestDistance(v: number[], set: number[][]): number {
  let best = 1;
  for (const s of set) {
    const d = distance(v, s);
    if (d < best) best = d;
  }
  return best;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function shortId(rng: () => number): string {
  return Math.floor(rng() * 0xffffffff)
    .toString(36)
    .padStart(7, "0")
    .slice(0, 7);
}

/** Run async tasks with bounded concurrency, preserving input order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Text that gets embedded for an idea. Avoids doubling when the title is a prefix of the mechanism. */
export function ideaText(idea: { title: string; mechanism: string }): string {
  const title = idea.title.trim();
  const mech = idea.mechanism.trim();
  if (!mech || mech.startsWith(title)) return mech || title;
  return `${title}. ${mech}`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
