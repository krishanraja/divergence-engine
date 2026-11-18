import { CachedEmbedder, LexicalEmbedder, OpenAIEmbedder } from "./embedder.js";
/**
 * Local sentence embeddings (all-MiniLM-L6-v2, quantized) via transformers.js.
 * No API key; the model downloads once from Hugging Face (about 23 MB) and is cached.
 */
export class LocalEmbedder {
    model;
    id;
    extractor = null;
    constructor(model = "Xenova/all-MiniLM-L6-v2") {
        this.model = model;
        this.id = `local:${model}`;
    }
    load() {
        if (!this.extractor) {
            this.extractor = (async () => {
                const mod = (await import("@huggingface/transformers"));
                return mod.pipeline("feature-extraction", this.model, { dtype: "q8" });
            })();
        }
        return this.extractor;
    }
    async embed(texts) {
        if (texts.length === 0)
            return [];
        const extract = await this.load();
        const out = [];
        for (let i = 0; i < texts.length; i += 32) {
            const batch = texts.slice(i, i + 32);
            const t = await extract(batch, { pooling: "mean", normalize: true });
            out.push(...t.tolist());
        }
        return out;
    }
}
/**
 * Picks the best available embedder. DIVERGENT_EMBEDDER=lexical forces the fallback.
 * If the local model fails to load, the run continues on the lexical embedder and says so.
 */
export async function createEmbedder(preference = process.env.DIVERGENT_EMBEDDER, onWarning) {
    if (preference === "lexical")
        return new CachedEmbedder(new LexicalEmbedder());
    if (preference === "openai") {
        const key = process.env.OPENAI_API_KEY;
        if (!key)
            throw new Error("DIVERGENT_EMBEDDER=openai needs OPENAI_API_KEY");
        return new CachedEmbedder(new OpenAIEmbedder(key));
    }
    const local = new LocalEmbedder(preference && preference !== "local" ? preference : undefined);
    try {
        await local.embed(["warmup"]);
        return new CachedEmbedder(local);
    }
    catch (err) {
        onWarning?.(`Local embedding model unavailable (${err.message}). Falling back to lexical distance, which cannot see paraphrase.`);
        return new CachedEmbedder(new LexicalEmbedder());
    }
}
//# sourceMappingURL=local.js.map