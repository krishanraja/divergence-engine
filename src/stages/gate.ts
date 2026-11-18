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
}

/**
 * Measured, not guessed (bench/calibrate.mts, MiniLM, three problems, 15 rewordings,
 * 15 non-obvious ideas): rewordings of consensus answers land at 0.22 to 0.77 spreads,
 * genuinely non-obvious on-topic ideas at 0.83 to 1.10. Balanced sits in that gap.
 * Grounded admits borderline ideas and lets the judge decide; wild demands more distance.
 */
const GRAVITY_FACTOR: Record<Temperament, number> = {
  grounded: 0.75,
  balanced: 0.8,
  wild: 0.9,
};

/** Used only when there are fewer than two wells to measure a spread from. */
const FALLBACK_SPREAD = 0.35;

export function calibrate(wellVectors: number[][], temperament: Temperament): Calibration {
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
    gravityThreshold: spread * GRAVITY_FACTOR[temperament],
    duplicateThreshold: spread * 0.5,
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
