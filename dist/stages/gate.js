import { distance, median, nearestDistance } from "../util.js";
/**
 * Gate factors per embedder, measured with `npm run calibrate` (src/calibration.ts),
 * never guessed. MiniLM, three problems, 15 rewordings and 15 non-obvious ideas:
 * rewordings land at up to 0.77 spreads, non-obvious ideas from 0.83. Balanced sits
 * in that gap; grounded admits borderline ideas and lets the judge decide; wild
 * demands more distance. An embedder with no measured row runs on the MiniLM factors
 * and reports `calibrated: false`, which a host can refuse to generate on.
 */
export const GATE_FACTORS = {
    "local:Xenova/all-MiniLM-L6-v2": { grounded: 0.75, balanced: 0.8, wild: 0.9 },
};
const DEFAULT_FACTORS = GATE_FACTORS["local:Xenova/all-MiniLM-L6-v2"];
/** The factors for an embedder, and whether they were measured for it. */
export function gateFactorsFor(embedderId, override) {
    const measured = embedderId ? GATE_FACTORS[embedderId] : undefined;
    const base = measured ?? DEFAULT_FACTORS;
    const factors = { ...base, ...(override ?? {}) };
    return { factors, calibrated: !!measured || !!(override && Object.keys(override).length) };
}
/** Used only when there are fewer than two wells to measure a spread from. */
const FALLBACK_SPREAD = 0.35;
export function calibrate(wellVectors, temperament, override, embedderId) {
    const { factors, calibrated } = gateFactorsFor(embedderId, override);
    let spread = FALLBACK_SPREAD;
    if (wellVectors.length >= 2) {
        const nn = wellVectors.map((v, i) => {
            let best = 1;
            wellVectors.forEach((w, j) => {
                if (i !== j)
                    best = Math.min(best, distance(v, w));
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
export function gate(input) {
    const { vector, calibration: cal } = input;
    const wellDistance = nearestDistance(vector, input.wells);
    const archiveDistance = nearestDistance(vector, input.archive);
    const peerDistance = nearestDistance(vector, input.peers);
    const metrics = {
        wellDistance,
        archiveDistance,
        peerDistance,
        remoteness: wellDistance / cal.spread,
    };
    const lowered = input.text.toLowerCase();
    if (input.bannedWords.some((w) => w && new RegExp(`\\b${escapeRegex(w.toLowerCase())}\\b`).test(lowered))) {
        return { status: "rejected_anchor_word", metrics };
    }
    if (wellDistance < cal.gravityThreshold)
        return { status: "rejected_gravity", metrics };
    if (archiveDistance < cal.duplicateThreshold)
        return { status: "rejected_archive", metrics };
    if (peerDistance < cal.duplicateThreshold)
        return { status: "rejected_duplicate", metrics };
    return { status: "accepted", metrics };
}
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export async function embedOne(embedder, text) {
    const [v] = await embedder.embed([text]);
    return v;
}
//# sourceMappingURL=gate.js.map