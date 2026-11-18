/**
 * Gate calibration check with a real embedder. No model calls, no spend.
 * Uses the calibration set shipped in src/calibration.ts.
 *
 *   npm run calibrate                                  # local MiniLM
 *   DIVERGENT_EMBEDDER=lexical npm run calibrate        # the fallback
 *   DIVERGENT_EMBEDDER=openai OPENAI_API_KEY=... npm run calibrate
 */
import { createEmbedder } from "../src/embed/local.js";
import { runCalibration } from "../src/calibration.js";

const emb = await createEmbedder(process.env.DIVERGENT_EMBEDDER, (m) => console.error(`warning: ${m}`));
const r = await runCalibration(emb);
console.log(`embedder: ${r.embedder}`);
console.log(`rewordings reach up to ${r.maxRewordRemoteness} spreads; non-obvious ideas start at ${r.minNovelRemoteness}`);
console.log(r.separable ? `separable: suggested balanced factor ${r.suggestedBalanced}` : "NOT separable: no single factor rejects every rewording and keeps every new idea");
for (const [t, c] of Object.entries(r.byTemperament)) {
  console.log(`${t}: rewordings rejected ${c.rewordsRejected}/${c.total}, novel accepted ${c.novelAccepted}/${c.total}, distinct novel pairs wrongly flagged duplicate ${c.falseDuplicates}/${c.pairs}`);
}
