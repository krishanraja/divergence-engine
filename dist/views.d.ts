import type { RunReport } from "./types.js";
/** Compact payload for agents: everything needed to act, nothing that wastes context. */
export declare function compactReport(r: RunReport): {
    runId: string;
    namespace: string;
    consensus: import("./types.js").ConsensusMap;
    sparks: {
        rank: number;
        title: string;
        mechanism: string;
        whyNonObvious: string;
        firstStep: string;
        lens: string;
        kind: import("./types.js").NodeKind;
        conventionalTwin: string | undefined;
        survivedAttack: string | undefined;
        score: number;
        remoteness: number;
        judge: {
            originality: number;
            usefulness: number;
            specificity: number;
        } | undefined;
        prompt: string;
    }[];
    stats: {
        generated: number;
        accepted: number;
        rejected: Record<string, number>;
        meanRemotenessSelected: number;
        meanPairwiseDistanceSelected: number;
        stopReason: string;
    };
    usage: import("./types.js").RunUsage;
    embedder: string;
};
/** Human-readable rendering for the terminal. */
export declare function renderMarkdown(r: RunReport): string;
