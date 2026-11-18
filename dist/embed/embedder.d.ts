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
export declare class CachedEmbedder implements Embedder {
    private readonly inner;
    private readonly cache;
    constructor(inner: Embedder);
    get id(): string;
    embed(texts: string[]): Promise<number[][]>;
}
/**
 * Dependency-free fallback: hashed word unigrams, bigrams and character 4-grams.
 * Captures lexical overlap only, so it catches rewordings and shared vocabulary but not
 * paraphrase. Used when the local model cannot load, and in tests for speed.
 */
export declare class LexicalEmbedder implements Embedder {
    private readonly dim;
    readonly id = "lexical:hash-1024";
    constructor(dim?: number);
    embed(texts: string[]): Promise<number[][]>;
    private vector;
}
/**
 * OpenAI text-embedding-3-small over HTTPS. Used where a local model cannot run
 * (serverless hosts such as Control Center, whose function size limit rules out the
 * local runtime). The key is passed in by the host, never read from a file.
 */
export declare class OpenAIEmbedder implements Embedder {
    private readonly key;
    private readonly model;
    private readonly fetcher;
    readonly id: string;
    constructor(key: string, model?: string, fetcher?: typeof fetch);
    embed(texts: string[]): Promise<number[][]>;
}
