import { type MemoryStore } from "./archive.js";
import type { Embedder } from "./embed/embedder.js";
import { type LLMProvider } from "./llm/provider.js";
import { type Calibration } from "./stages/gate.js";
import type { ConsensusMap, IdeaDraft, JudgeScores, RunOptions, RunReport, Target, Temperament } from "./types.js";
export interface EngineDeps {
    provider: LLMProvider;
    embedder: Embedder;
    /** Archive root for the default file store, mainly for tests. Ignored when `store` is given. */
    archiveRoot?: string;
    /** Where namespace memory lives. Default: files under DIVERGENT_HOME. */
    store?: MemoryStore;
    /** Gate factors measured for this host's embedder (`runCalibration`), overriding the built-in table. */
    gateFactors?: Partial<Record<Temperament, number>>;
    /** Parallel model calls. Default 4. */
    concurrency?: number;
}
export declare class DivergentEngine {
    private readonly deps;
    private readonly store;
    constructor(deps: EngineDeps);
    /**
     * Full pipeline: map the consensus, diverge through lenses in waves, gate for novelty,
     * attack and mutate the best survivors, judge blind, then select a diverse portfolio.
     */
    run(options: RunOptions): Promise<RunReport>;
    /**
     * Cheap mode for high-frequency callers: one consensus call, one multi-lens call,
     * novelty gate, portfolio. Two model calls, no dialectic, no judge.
     */
    provoke(options: Pick<RunOptions, "problem" | "context" | "cliches" | "bannedWords" | "namespace" | "count" | "seed" | "target" | "remember">): Promise<RunReport>;
    /** Map only: what everyone else will say, and the assumptions they share. One call. */
    mapConsensus(problem: string, context?: string, provider?: LLMProvider): Promise<ConsensusMap>;
    /**
     * Measure how divergent a set of ideas is, without generating anything.
     * This is the engine as a critic: other engines can send their outputs here to find
     * out whether they are producing the consensus in disguise.
     */
    score(args: {
        problem: string;
        ideas: Array<string | IdeaDraft>;
        obvious?: string[];
        namespace?: string;
        judge?: boolean;
        temperament?: Temperament;
        /** Words that flag an idea as rejected_anchor_word, e.g. a venture's kill list. */
        bannedWords?: string[];
    }): Promise<{
        consensus: ConsensusMap;
        calibration: Calibration;
        /** Fewer than five consensus answers gives a noisy spread estimate. */
        calibrationReliable: boolean;
        divergenceIndex: number;
        shareOutsideConsensus: number;
        results: {
            title: string;
            /** The gate's verdict: accepted, or the first reason it would be rejected. */
            status: import("./types.js").NodeStatus;
            outsideConsensus: boolean;
            /** True when this namespace has already shipped or been handed something this close. */
            repeatsArchive: boolean;
            metrics: import("./types.js").NoveltyMetrics;
            judge: JudgeScores | undefined;
            score: number;
        }[];
        usage: {
            calls: number;
            estimatedCostUsd: number;
        };
        embedder: string;
    }>;
    /**
     * Record outputs a consuming engine actually shipped (posts, hooks, plays), so later
     * runs in that namespace treat them as already used. Zero model calls.
     * Send de-identified text only: the archive is plain files on the host running the engine.
     */
    record(args: {
        namespace: string;
        items: Array<string | {
            title: string;
            mechanism?: string;
        }>;
        label?: string;
    }): Promise<{
        namespace: string;
        recorded: number;
        skippedDuplicates: number;
        archiveSize: number;
    }>;
    /**
     * Push an existing idea or plan: attack it, then return a mutation that keeps its
     * strange core and moves further from the consensus. Three calls.
     */
    challenge(args: {
        problem: string;
        idea: string | IdeaDraft;
        context?: string;
        target?: Target;
        namespace?: string;
    }): Promise<{
        consensus: ConsensusMap;
        attack: {
            conventionalTwin: string;
            fatalFlaw: string;
            counterIdea: {
                title: string;
                mechanism: string;
                whyNonObvious: string;
                firstStep: string;
            };
        };
        original: {
            idea: IdeaDraft;
            metrics: import("./types.js").NoveltyMetrics;
        };
        mutation: {
            idea: {
                title: string;
                mechanism: string;
                whyNonObvious: string;
                firstStep: string;
            };
            rationale: string;
            metrics: import("./types.js").NoveltyMetrics;
            regressed: boolean;
            prompt: string;
        };
        counter: {
            idea: {
                title: string;
                mechanism: string;
                whyNonObvious: string;
                firstStep: string;
            };
            metrics: import("./types.js").NoveltyMetrics;
        };
        usage: {
            calls: number;
            estimatedCostUsd: number;
        };
    }>;
    private probe;
    /** Create a node, embed it, and pass it through the novelty gate. */
    private admit;
    private dialectic;
    private judge;
    private judgeMap;
    private select;
    private crossPollinate;
    private toSpark;
    /** Shared skeleton for the two-call provoke mode. */
    private runLite;
}
