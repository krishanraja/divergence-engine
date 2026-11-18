/** Small deterministic helpers shared across stages. */
/** Mulberry32: tiny, fast, seedable PRNG. Good enough for sampling, not crypto. */
export declare function createRng(seed: number): () => number;
export declare function pick<T>(rng: () => number, items: readonly T[]): T;
export declare function shuffle<T>(rng: () => number, items: readonly T[]): T[];
/** Beta(a, b) sample via two gamma draws (Marsaglia and Tsang). */
export declare function sampleBeta(rng: () => number, a: number, b: number): number;
export declare function cosine(a: number[], b: number[]): number;
/** Cosine distance clipped to [0, 1]. Negative similarity counts as fully distant. */
export declare function distance(a: number[], b: number[]): number;
/** Smallest distance from v to any vector in set. Returns 1 for an empty set. */
export declare function nearestDistance(v: number[], set: number[][]): number;
export declare function median(xs: number[]): number;
export declare function mean(xs: number[]): number;
export declare function shortId(rng: () => number): string;
/** Run async tasks with bounded concurrency, preserving input order. */
export declare function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>;
/** Text that gets embedded for an idea. Avoids doubling when the title is a prefix of the mechanism. */
export declare function ideaText(idea: {
    title: string;
    mechanism: string;
}): string;
export declare function clamp(x: number, lo: number, hi: number): number;
