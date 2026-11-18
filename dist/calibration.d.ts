/**
 * The novelty gate's calibration set, shipped in the package so a host can measure
 * its own embedder where its key lives (Control Center runs it on OpenAI embeddings).
 *
 * Per problem: a consensus set, rewordings of it (must be rejected) and genuinely
 * non-obvious, on-topic ideas (must pass). The non-obvious ideas reuse the topic's
 * vocabulary on purpose: that is the hard case for an embedder that clusters by topic.
 * Hand-written by one author: extend it with real outputs before trusting it on a new domain.
 */
import type { Embedder } from "./embed/embedder.js";
import type { Temperament } from "./types.js";
export interface CalibrationCase {
    problem: string;
    obvious: string[];
    reworded: string[];
    novel: string[];
}
export declare const CALIBRATION_CASES: CalibrationCase[];
export interface CalibrationResult {
    embedder: string;
    /** Highest remoteness any rewording reached, in multiples of the consensus spread. */
    maxRewordRemoteness: number;
    /** Lowest remoteness any non-obvious idea reached. */
    minNovelRemoteness: number;
    /** True when every rewording sits below every non-obvious idea: one factor separates them. */
    separable: boolean;
    /** The midpoint of the gap, the balanced factor to use. Null when not separable. */
    suggestedBalanced: number | null;
    /** Counts at the factors given (or the embedder's current ones). */
    byTemperament: Record<Temperament, {
        rewordsRejected: number;
        novelAccepted: number;
        total: number;
        falseDuplicates: number;
        pairs: number;
    }>;
}
/** Measure an embedder against the calibration set. Zero model calls; one embedding batch per case. */
export declare function runCalibration(embedder: Embedder, factors?: Partial<Record<Temperament, number>>): Promise<CalibrationResult>;
