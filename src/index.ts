export { DivergentEngine, type EngineDeps } from "./engine.js";
export { AnthropicProvider, resolveRoleModels, type AnthropicProviderOptions } from "./llm/anthropic.js";
export { ScriptedProvider } from "./llm/scripted.js";
export { MeteredProvider, BudgetExceededError, RefusalError, type LLMProvider, type Role } from "./llm/provider.js";
export { createEmbedder, LocalEmbedder, LexicalEmbedder, CachedEmbedder, type Embedder } from "./embed/embedder.js";
export { LENSES, type Lens } from "./lenses.js";
export { calibrate, gate } from "./stages/gate.js";
export { divergenceScore, selectPortfolio } from "./stages/score.js";
export { Archive, LensBandit, divergentHome } from "./archive.js";
export * from "./types.js";

import { DivergentEngine } from "./engine.js";
import { AnthropicProvider, type AnthropicProviderOptions } from "./llm/anthropic.js";
import { createEmbedder } from "./embed/embedder.js";

/** One-line setup for callers that want the defaults: Anthropic API plus local embeddings. */
export async function createEngine(opts: AnthropicProviderOptions & { embedder?: string; onWarning?: (m: string) => void } = {}) {
  const embedder = await createEmbedder(opts.embedder, opts.onWarning);
  return new DivergentEngine({ provider: new AnthropicProvider(opts), embedder });
}
