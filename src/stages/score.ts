import type { JudgeScores, NoveltyMetrics, Temperament } from "../types.js";
import { clamp, nearestDistance } from "../util.js";

/**
 * Final divergence score: a weighted geometric mean of four signals in (0, 1].
 *
 * Geometric, not arithmetic, on purpose. An idea that is remote but useless, or useful
 * but conventional, should not be rescued by being excellent on one axis. Any signal
 * near zero drags the whole score down. This is how the engine separates divergence
 * from noise without a trained classifier.
 */
const WEIGHTS: Record<Temperament, { remote: number; orig: number; useful: number; specific: number }> = {
  grounded: { remote: 1, orig: 1, useful: 2, specific: 1.5 },
  balanced: { remote: 1, orig: 1.5, useful: 1, specific: 1 },
  wild: { remote: 1.5, orig: 2, useful: 0.5, specific: 0.5 },
};

/** Minimum judged usefulness to survive. Wild mode tolerates more risk. */
export const USEFULNESS_FLOOR: Record<Temperament, number> = {
  grounded: 3,
  balanced: 2,
  wild: 1.5,
};

/** Maps remoteness (multiples of consensus spread) into (0, 1). One spread away scores about 0.63. */
export function remoteSignal(remoteness: number): number {
  return clamp(1 - Math.exp(-remoteness), 0.02, 1);
}

function rubric(x: number): number {
  return clamp((x - 1) / 4, 0.05, 1);
}

export function divergenceScore(metrics: NoveltyMetrics, judge: JudgeScores | undefined, temperament: Temperament): number {
  const r = remoteSignal(metrics.remoteness);
  if (!judge) return r;
  const w = WEIGHTS[temperament];
  const parts: Array<[number, number]> = [
    [r, w.remote],
    [rubric(judge.originality), w.orig],
    [rubric(judge.usefulness), w.useful],
    [rubric(judge.specificity), w.specific],
  ];
  const total = parts.reduce((s, [, wt]) => s + wt, 0);
  const logSum = parts.reduce((s, [v, wt]) => s + wt * Math.log(v), 0);
  return Math.exp(logSum / total);
}

/**
 * Maximal marginal relevance: build a portfolio that is good and mutually different.
 * Each pick maximises lambda x score + (1 - lambda) x distance to the nearest pick so far.
 */
export function selectPortfolio<T extends { score: number; vector: number[] }>(items: T[], count: number, lambda = 0.7): T[] {
  const pool = items.slice();
  const chosen: T[] = [];
  while (chosen.length < count && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((it, i) => {
      const diversity = chosen.length ? nearestDistance(it.vector, chosen.map((c) => c.vector)) : 1;
      const val = lambda * it.score + (1 - lambda) * diversity;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    });
    chosen.push(pool.splice(bestIdx, 1)[0]!);
  }
  return chosen;
}
