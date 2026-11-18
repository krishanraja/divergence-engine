/**
 * Core data model for the divergent thinking engine.
 *
 * The run state is a directed acyclic graph of thought nodes. Every node has
 * parents (a lens seed has the root, a mutation has its thesis, a hybrid has two
 * parents), so the lineage of any idea that reaches the caller is inspectable.
 */

export type Target =
  | "generic"
  | "code"
  | "writing"
  | "research"
  | "strategy"
  | "design"
  | "video"
  | "product";

/** How far the engine should trade usefulness for strangeness. */
export type Temperament = "grounded" | "balanced" | "wild";

export interface ConsensusMap {
  /** The answers most people, and most models, would give first. */
  obvious: string[];
  /** Assumptions every obvious answer silently shares. Inversion targets. */
  orthodoxies: string[];
}

export interface IdeaDraft {
  title: string;
  /** The concrete mechanism: how it actually works. */
  mechanism: string;
  /** Why a smart generalist would not have produced this. */
  whyNonObvious: string;
  /** The first concrete step to test or build it. */
  firstStep: string;
}

export type NodeKind = "root" | "seed" | "mutation" | "counter" | "hybrid";

export type NodeStatus =
  | "candidate"
  | "rejected_gravity" // too close to the consensus or an anchor
  | "rejected_duplicate" // too close to a sibling already accepted
  | "rejected_archive" // the engine has already given this idea before
  | "rejected_anchor_word" // contains a banned anchor word
  | "rejected_regression" // a mutation that slid back toward the consensus
  | "rejected_judge" // failed the judged usefulness floor
  | "accepted"
  | "superseded" // an accepted thesis replaced by its own stronger mutation
  | "selected";

export interface NoveltyMetrics {
  /** Cosine distance to the nearest consensus answer or user anchor. */
  wellDistance: number;
  /** Cosine distance to the nearest idea in this namespace's archive (1 when empty). */
  archiveDistance: number;
  /** Cosine distance to the nearest already-accepted node in this run (1 when none). */
  peerDistance: number;
  /** wellDistance divided by the calibrated consensus spread. Above 1 means outside the cluster. */
  remoteness: number;
}

export interface JudgeScores {
  /** 1 to 5, anchored on the AUT originality rubric. */
  originality: number;
  /** 1 to 5: would this work and matter if built. */
  usefulness: number;
  /** 1 to 5: concrete mechanism versus vague gesture. */
  specificity: number;
  rationale: string;
}

export interface DialecticTrace {
  conventionalTwin: string;
  fatalFlaw: string;
  counterIdea?: string;
  /** Node id of the counter idea, when it survived the gate on its own. */
  counterNodeId?: string;
  mutationRationale?: string;
  regressed?: boolean;
}

export interface ThoughtNode {
  id: string;
  kind: NodeKind;
  parents: string[];
  lens: string;
  stimulus?: string;
  wave: number;
  idea: IdeaDraft;
  status: NodeStatus;
  metrics?: NoveltyMetrics;
  judge?: JudgeScores;
  dialectic?: DialecticTrace;
  score?: number;
  embedding?: number[];
}

export interface Spark {
  id: string;
  rank: number;
  title: string;
  mechanism: string;
  whyNonObvious: string;
  firstStep: string;
  lens: string;
  stimulus?: string;
  kind: NodeKind;
  lineage: string[];
  conventionalTwin?: string;
  survivedAttack?: string;
  score: number;
  metrics: NoveltyMetrics;
  judge?: JudgeScores;
  /** Ready-to-run instruction for a downstream engine. */
  prompt: string;
}

export interface RunUsage {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface RunReport {
  runId: string;
  namespace: string;
  problem: string;
  target: Target;
  temperament: Temperament;
  seed: number;
  consensus: ConsensusMap;
  calibration: { spread: number; gravityThreshold: number; duplicateThreshold: number };
  sparks: Spark[];
  stats: {
    waves: number;
    generated: number;
    accepted: number;
    rejected: Record<string, number>;
    lensYield: Record<string, { tried: number; survived: number }>;
    meanRemotenessSelected: number;
    meanPairwiseDistanceSelected: number;
    stopReason: string;
  };
  usage: RunUsage;
  graph: ThoughtNode[];
  embedder: string;
  durationMs: number;
}

export interface RunOptions {
  problem: string;
  /** Context the engine should respect: constraints, audience, what exists already. */
  context?: string;
  /** Answers the caller already considers clichés. Added to the consensus wells. */
  cliches?: string[];
  /** Words that must not appear in any returned idea. */
  bannedWords?: string[];
  /** Memory partition. Each consuming engine should use its own. */
  namespace?: string;
  target?: Target;
  temperament?: Temperament;
  /** Number of sparks to return. */
  count?: number;
  /** Lens names to force. Default lets the bandit choose. */
  lenses?: string[];
  /** Ideas generated per lens call. */
  ideasPerLens?: number;
  /** Lens calls per wave. */
  lensesPerWave?: number;
  /** Maximum divergence waves before stopping. */
  maxWaves?: number;
  /** Rounds of attack and mutation for the top survivors. 0 disables. */
  dialecticRounds?: number;
  /** How many survivors go through the dialectic. */
  dialecticBeam?: number;
  /** Independent judge passes with shuffled order. Averaged to cut position bias. */
  judgePasses?: number;
  /** Attempt a cross-pollinated hybrid of the two most complementary sparks. */
  crossPollinate?: boolean;
  /** Hard ceiling on model calls for this run. */
  maxCalls?: number;
  /** Seed for stimulus, lens and ordering randomness. */
  seed?: number;
  /** Persist selected sparks to the namespace archive so they are never repeated. */
  remember?: boolean;
  /** Progress callback for streaming UIs and logs. */
  onEvent?: (event: EngineEvent) => void;
}

export type EngineEvent =
  | { type: "stage"; stage: string; detail?: string }
  | { type: "node"; node: Pick<ThoughtNode, "id" | "kind" | "lens" | "status"> & { title: string } }
  | { type: "wave"; wave: number; accepted: number; generated: number }
  | { type: "warning"; message: string };
