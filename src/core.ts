/**
 * The engine without its local runtime: no Anthropic SDK and no local embedding model
 * in this import graph, so a serverless host (Control Center) bundles only what it runs.
 * The host supplies an LLMProvider, an Embedder and, optionally, a MemoryStore.
 */
export { DivergentEngine, type EngineDeps } from "./engine.js";
export { MeteredProvider, BudgetExceededError, RefusalError, type LLMProvider, type Role, type Effort, type StructuredRequest, type StructuredResponse, type CallUsage } from "./llm/provider.js";
export { ScriptedProvider } from "./llm/scripted.js";
export { CachedEmbedder, LexicalEmbedder, OpenAIEmbedder, type Embedder } from "./embed/embedder.js";
export { Archive, FileMemoryStore, MemoryOnlyStore, LensBandit, divergentHome, type MemoryStore, type ArchivedSpark, type LensStats } from "./archive.js";
export { LENSES, type Lens } from "./lenses.js";
export { calibrate, gate, gateFactorsFor, GATE_FACTORS, type Calibration } from "./stages/gate.js";
export { divergenceScore, selectPortfolio } from "./stages/score.js";
export { runCalibration, CALIBRATION_CASES, type CalibrationResult } from "./calibration.js";
export { compactReport } from "./views.js";
export * from "./types.js";
