export { DivergentEngine, type EngineDeps } from "./engine.js";
export { AnthropicProvider, resolveRoleModels, type AnthropicProviderOptions } from "./llm/anthropic.js";
export { ScriptedProvider } from "./llm/scripted.js";
export { MeteredProvider, BudgetExceededError, RefusalError, type LLMProvider, type Role } from "./llm/provider.js";
export { LexicalEmbedder, CachedEmbedder, OpenAIEmbedder, type Embedder } from "./embed/embedder.js";
export { createEmbedder, LocalEmbedder } from "./embed/local.js";
export { LENSES, type Lens } from "./lenses.js";
export { calibrate, gate } from "./stages/gate.js";
export { divergenceScore, selectPortfolio } from "./stages/score.js";
export { Archive, LensBandit, divergentHome } from "./archive.js";
export * from "./types.js";
import { DivergentEngine } from "./engine.js";
import { type AnthropicProviderOptions } from "./llm/anthropic.js";
/** One-line setup for callers that want the defaults: Anthropic API plus local embeddings. */
export declare function createEngine(opts?: AnthropicProviderOptions & {
    embedder?: string;
    onWarning?: (m: string) => void;
}): Promise<DivergentEngine>;
