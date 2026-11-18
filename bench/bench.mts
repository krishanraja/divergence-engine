/**
 * Live A/B benchmark: does the engine beat a plain "be creative" prompt?
 *
 * For each problem, both arms produce N ideas. Both are then scored by the same
 * yardstick: the same consensus map, the same embedder, and the same blind judge
 * with both arms' ideas shuffled together so the judge cannot tell them apart.
 *
 * Pass signal (set before running): the engine arm beats the baseline on mean
 * divergence score AND share of ideas outside the consensus cluster, on a majority
 * of problems, without its mean judged usefulness dropping more than 0.5.
 *
 * Spends real tokens. Defaults to 3 problems, about 3 x (40 + 3) calls.
 *   ANTHROPIC_API_KEY=... npm run bench -- --problems 3 --max-calls 40
 */
import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { DivergentEngine } from "../src/engine.js";
import { AnthropicProvider } from "../src/llm/anthropic.js";
import { createEmbedder } from "../src/embed/embedder.js";
import { mean } from "../src/util.js";

const PROBLEMS = [
  "How can an independent bakery compete with supermarkets?",
  "How should a B2B software company reduce customer churn?",
  "Hooks for a short video about AI anxiety among senior leaders",
  "How could a city cut traffic congestion without building roads?",
  "New revenue lines for a podcast with 20,000 listeners",
];

const { values } = parseArgs({
  options: {
    problems: { type: "string", default: "3" },
    count: { type: "string", default: "5" },
    "max-calls": { type: "string", default: "40" },
    out: { type: "string", default: "bench-result.json" },
  },
});

const n = Number(values.count);
const provider = new AnthropicProvider();
const embedder = await createEmbedder(undefined, (m) => console.error(`warning: ${m}`));
const engine = new DivergentEngine({ provider, embedder, archiveRoot: `.divergent-bench-${Date.now()}` });

const BaselineSchema = z.object({ ideas: z.array(z.object({ title: z.string(), mechanism: z.string() })) });

const rows = [];
for (const problem of PROBLEMS.slice(0, Number(values.problems))) {
  console.error(`\n> ${problem}`);
  const baseline = await provider.structured({
    role: "diverge",
    schema: BaselineSchema,
    system: "You are a highly creative strategist.",
    user: `${problem}\n\nGive me ${n} creative, original, non-obvious ideas. Each needs a title and a two to four sentence mechanism.`,
  });
  const report = await engine.run({ problem, count: n, maxCalls: Number(values["max-calls"]), remember: false });

  const base = baseline.data.ideas.slice(0, n).map((i) => ({ ...i, whyNonObvious: "", firstStep: "", arm: "baseline" }));
  const eng = report.sparks.map((s) => ({ title: s.title, mechanism: s.mechanism, whyNonObvious: "", firstStep: "", arm: "engine" }));
  const both = [...base, ...eng];
  // Same consensus as the engine run, blind judge over the pooled, shuffled set.
  const scored = await engine.score({ problem, ideas: both, obvious: report.consensus.obvious, judge: true });
  const arm = (name: string) => {
    const r = scored.results.filter((_, i) => both[i]!.arm === name);
    return {
      meanScore: mean(r.map((x) => x.score)),
      outsideConsensus: r.filter((x) => x.outsideConsensus).length / Math.max(1, r.length),
      meanRemoteness: mean(r.map((x) => x.metrics.remoteness)),
      meanOriginality: mean(r.map((x) => x.judge?.originality ?? 0)),
      meanUsefulness: mean(r.map((x) => x.judge?.usefulness ?? 0)),
    };
  };
  const row = { problem, baseline: arm("baseline"), engine: arm("engine"), engineCostUsd: report.usage.estimatedCostUsd, engineCalls: report.usage.calls };
  console.error(JSON.stringify(row, null, 2));
  rows.push(row);
}

const wins = rows.filter(
  (r) =>
    r.engine.meanScore > r.baseline.meanScore &&
    r.engine.outsideConsensus >= r.baseline.outsideConsensus &&
    r.baseline.meanUsefulness - r.engine.meanUsefulness <= 0.5,
).length;
const verdict = wins > rows.length / 2 ? "PASS" : "FAIL";
console.log(`\n${verdict}: engine won ${wins}/${rows.length} problems`);
await writeFile(values.out!, JSON.stringify({ verdict, wins, rows }, null, 2));
