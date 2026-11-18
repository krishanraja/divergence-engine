export { DivergentEngine } from "./engine.js";
export { AnthropicProvider, resolveRoleModels } from "./llm/anthropic.js";
export { ScriptedProvider } from "./llm/scripted.js";
export { MeteredProvider, BudgetExceededError, RefusalError } from "./llm/provider.js";
export { LexicalEmbedder, CachedEmbedder, OpenAIEmbedder } from "./embed/embedder.js";
export { createEmbedder, LocalEmbedder } from "./embed/local.js";
export { LENSES } from "./lenses.js";
export { calibrate, gate } from "./stages/gate.js";
export { divergenceScore, selectPortfolio } from "./stages/score.js";
export { Archive, LensBandit, divergentHome } from "./archive.js";
export * from "./types.js";
import { DivergentEngine } from "./engine.js";
import { AnthropicProvider } from "./llm/anthropic.js";
import { createEmbedder } from "./embed/local.js";
/** One-line setup for callers that want the defaults: Anthropic API plus local embeddings. */
export async function createEngine(opts = {}) {
    const embedder = await createEmbedder(opts.embedder, opts.onWarning);
    return new DivergentEngine({ provider: new AnthropicProvider(opts), embedder });
}
//# sourceMappingURL=index.js.map