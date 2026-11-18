import type { JudgeScores, NoveltyMetrics, Temperament } from "../types.js";
/** Minimum judged usefulness to survive. Wild mode tolerates more risk. */
export declare const USEFULNESS_FLOOR: Record<Temperament, number>;
/** Maps remoteness (multiples of consensus spread) into (0, 1). One spread away scores about 0.63. */
export declare function remoteSignal(remoteness: number): number;
export declare function divergenceScore(metrics: NoveltyMetrics, judge: JudgeScores | undefined, temperament: Temperament): number;
/**
 * Maximal marginal relevance: build a portfolio that is good and mutually different.
 * Each pick maximises lambda x score + (1 - lambda) x distance to the nearest pick so far.
 */
export declare function selectPortfolio<T extends {
    score: number;
    vector: number[];
}>(items: T[], count: number, lambda?: number): T[];
