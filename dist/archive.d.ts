import type { Embedder } from "./embed/embedder.js";
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
export declare function divergentHome(): string;
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
export declare class FileMemoryStore implements MemoryStore {
    private readonly root;
    readonly id = "file";
    constructor(root?: string);
    private dir;
    loadSparks(ns: string): Promise<ArchivedSpark[]>;
    appendSparks(ns: string, entries: ArchivedSpark[]): Promise<void>;
    loadLensStats(ns: string): Promise<Record<string, LensStats>>;
    saveLensStats(ns: string, stats: Record<string, LensStats>): Promise<void>;
}
/** In-memory store, for tests and for hosts that want no persistence. */
export declare class MemoryOnlyStore implements MemoryStore {
    readonly id = "memory";
    private readonly sparks;
    private readonly lenses;
    loadSparks(ns: string): Promise<{
        text: string;
        title: string;
        runId: string;
        ts: string;
        embedder: string;
        vector: number[];
    }[]>;
    appendSparks(ns: string, entries: ArchivedSpark[]): Promise<void>;
    loadLensStats(ns: string): Promise<{
        [x: string]: LensStats;
    }>;
    saveLensStats(ns: string, stats: Record<string, LensStats>): Promise<void>;
}
/** One namespace's memory for one run, over any store. */
export declare class Archive {
    private readonly namespace;
    sparks: ArchivedSpark[];
    lenses: Record<string, LensStats>;
    private readonly store;
    constructor(namespace: string, store?: MemoryStore | string);
    load(embedder: Embedder): Promise<void>;
    vectors(): number[][];
    remember(entries: Omit<ArchivedSpark, "ts">[]): Promise<void>;
    saveLensStats(): Promise<void>;
}
/**
 * Thompson-sampling lens selector. Each lens keeps a Beta(survived + 1, rejected + 1)
 * posterior. Each wave samples every lens and runs the highest draws, so lenses that
 * keep producing surviving ideas get chosen more, while weak lenses still get explored.
 */
export declare class LensBandit {
    private readonly stats;
    private readonly rng;
    constructor(stats: Record<string, LensStats>, rng: () => number);
    choose(k: number, exclude?: Set<string>): string[];
    record(lens: string, survived: number, rejected: number): void;
}
