import { type Embedder } from "./embedder.js";
/**
 * Local sentence embeddings (all-MiniLM-L6-v2, quantized) via transformers.js.
 * No API key; the model downloads once from Hugging Face (about 23 MB) and is cached.
 */
export declare class LocalEmbedder implements Embedder {
    private readonly model;
    readonly id: string;
    private extractor;
    constructor(model?: string);
    private load;
    embed(texts: string[]): Promise<number[][]>;
}
/**
 * Picks the best available embedder. DIVERGENT_EMBEDDER=lexical forces the fallback.
 * If the local model fails to load, the run continues on the lexical embedder and says so.
 */
export declare function createEmbedder(preference?: string | undefined, onWarning?: (msg: string) => void): Promise<Embedder>;
