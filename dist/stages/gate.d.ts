import type { Embedder } from "../embed/embedder.js";
import type { NodeStatus, NoveltyMetrics, Temperament } from "../types.js";
/**
 * The novelty gate.
 *
 * Fixed cosine thresholds (the classic "distance > 0.65" rule) break the moment you
 * change embedding model, domain, or problem: some problems have a tight consensus,
 * some a loose one. This gate calibrates itself per run instead.
 *
 * The consensus answers form a cluster. Their median nearest-neighbour distance is
 * the "spread": how far apart two mainstream answers typically are. A candidate must
 * sit at least spread x factor away from every consensus answer: roughly as far from the
 * mainstream as the mainstream answers are from each other.
 * Duplicates are anything closer than half the spread to an idea already accepted.
 */
export interface Calibration {
    spread: number;
    gravityThreshold: number;
    duplicateThreshold: number;
    /** False when the gate factors were not measured for this embedder. */
    calibrated?: boolean;
}
/**
 * Gate factors per embedder, measured with `npm run calibrate` (src/calibration.ts),
 * never guessed. MiniLM, three problems, 15 rewordings and 15 non-obvious ideas:
 * rewordings land at up to 0.77 spreads, non-obvious ideas from 0.83. Balanced sits
 * in that gap; grounded admits borderline ideas and lets the judge decide; wild
 * demands more distance. An embedder with no measured row runs on the MiniLM factors
 * and reports `calibrated: false`, which a host can refuse to generate on.
 */
export declare const GATE_FACTORS: Record<string, Record<Temperament, number>>;
/** The factors for an embedder, and whether they were measured for it. */
export declare function gateFactorsFor(embedderId?: string, override?: Partial<Record<Temperament, number>>): {
    factors: {
        balanced: number;
        grounded: number;
        wild: number;
    };
    calibrated: boolean;
};
export declare function calibrate(wellVectors: number[][], temperament: Temperament, override?: Partial<Record<Temperament, number>>, embedderId?: string): Calibration;
export interface GateInput {
    vector: number[];
    text: string;
    wells: number[][];
    archive: number[][];
    peers: number[][];
    bannedWords: string[];
    calibration: Calibration;
}
export interface GateResult {
    status: NodeStatus;
    metrics: NoveltyMetrics;
}
export declare function gate(input: GateInput): GateResult;
export declare function embedOne(embedder: Embedder, text: string): Promise<number[]>;
