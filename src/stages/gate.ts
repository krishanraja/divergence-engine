import type { Embedder } from "../embed/embedder.js";
import type { NodeStatus, NoveltyMetrics, Temperament } from "../types.js";
import { distance, median, nearestDistance } from "../util.js";

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
export const GATE_FACTORS: Record<string, Record<Temperament, number>> = {
  "local:Xenova/all-MiniLM-L6-v2": { grounded: 0.75, balanced: 0.8, wild: 0.9 },
};

const DEFAULT_FACTORS: Record<Temperament, number> = GATE_FACTORS["local:Xenova/all-MiniLM-L6-v2"]!;

/** The factors for an embedder, and whether they were measured for it. */
export function gateFactorsFor(embedderId?: string, override?: Partial<Record<Temperament, number>>) {
  const measured = embedderId ? GATE_FACTORS[embedderId] : undefined;
  const base = measured ?? DEFAULT_FACTORS;
  const factors = { ...base, ...(override ?? {}) };
  return { factors, calibrated: !!measured || !!(override && Object.keys(override).length) };
}

/** Used only when there are fewer than two wells to measure a spread from. */
const FALLBACK_SPREAD = 0.35;

export function calibrate(
  wellVectors: number[][],
  temperament: Temperament,
  override?: Partial<Record<Temperament, number>>,
  embedderId?: string,
): Calibration {
  const { factors, calibrated } = gateFactorsFor(embedderId, override);
  let spread = FALLBACK_SPREAD;
  if (wellVectors.length >= 2) {
    const nn = wellVectors.map((v, i) => {
      let best = 1;
      wellVectors.forEach((w, j) => {
        if (i !== j) best = Math.min(best, distance(v, w));
      });
      return best;
    });
    spread = Math.max(0.02, median(nn));
  }
  return {
    spread,
    gravityThreshold: spread * factors[temperament],
    duplicateThreshold: spread * 0.5,
    calibrated,
  };
}

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

export function gate(input: GateInput): GateResult {
  const { vector, calibration: cal } = input;
  const wellDistance = nearestDistance(vector, input.wells);
  const archiveDistance = nearestDistance(vector, input.archive);
  const peerDistance = nearestDistance(vector, input.peers);
  const metrics: NoveltyMetrics = {
    wellDistance,
    archiveDistance,
    peerDistance,
    remoteness: wellDistance / cal.spread,
  };

  const lowered = input.text.toLowerCase();
  if (input.bannedWords.some((w) => w && new RegExp(`\\b${escapeRegex(w.toLowerCase())}\\b`).test(lowered))) {
    return { status: "rejected_anchor_word", metrics };
  }
  if (wellDistance < cal.gravityThreshold) return { status: "rejected_gravity", metrics };
  if (archiveDistance < cal.duplicateThreshold) return { status: "rejected_archive", metrics };
  if (peerDistance < cal.duplicateThreshold) return { status: "rejected_duplicate", metrics };
  return { status: "accepted", metrics };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function embedOne(embedder: Embedder, text: string): Promise<number[]> {
  const [v] = await embedder.embed([text]);
  return v!;
}
