/**
 * Live benchmark: does the engine beat a strong single call?
 *
 * Three arms per problem, N ideas each:
 *   naive   one call, "give me creative ideas"
 *   strong  one call, prompt-matched: same model, the same consensus map as forbidden
 *           territory, and all twelve lens operators in a single prompt
 *   engine  the full pipeline
 *
 * The strong arm is the control that matters. dialectica's ablations found most
 * multi-call scaffolds tie or lose to a prompt-matched single call; beating a naive
 * prompt proves nothing. All arms are scored by one yardstick: the same consensus,
 * embedder and blind judge, with every arm's ideas pooled and shuffled.
 *
 * Pass signal (set before running): the engine beats the STRONG arm on mean divergence
 * score AND share of ideas outside the consensus, on a majority of problems, without its
 * mean judged usefulness falling more than 0.5 below the strong arm's.
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
import { LENSES } from "../src/lenses.js";
import { IdeasSchema, divergePrompt } from "../src/prompts.js";

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

// The engine's judge also scores here, so the judge cannot favour its own pipeline's
// phrasing: every arm is stripped to title + mechanism before scoring.
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
  const strong = await provider.structured({
    role: "diverge",
    schema: IdeasSchema,
    ...divergePrompt({
      problem,
      instruction: `Use every one of these operators across your ideas:\n${LENSES.map((l) => `- ${l.name}: ${l.summary}`).join("\n")}\nThen keep only the ${n} ideas that are most non-obvious and still workable.`,
      avoid: report.consensus.obvious,
      bannedWords: [],
      count: n,
    }),
  });

  const strip = (i: { title: string; mechanism: string }, arm: string) => ({ title: i.title, mechanism: i.mechanism, whyNonObvious: "", firstStep: "", arm });
  const both = [
    ...baseline.data.ideas.slice(0, n).map((i) => strip(i, "naive")),
    ...strong.data.ideas.slice(0, n).map((i) => strip(i, "strong")),
    ...report.sparks.map((s) => strip(s, "engine")),
  ];
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
  const row = { problem, naive: arm("naive"), strong: arm("strong"), engine: arm("engine"), engineCostUsd: report.usage.estimatedCostUsd, engineCalls: report.usage.calls };
  console.error(JSON.stringify(row, null, 2));
  rows.push(row);
}

const wins = rows.filter(
  (r) =>
    r.engine.meanScore > r.strong.meanScore &&
    r.engine.outsideConsensus >= r.strong.outsideConsensus &&
    r.strong.meanUsefulness - r.engine.meanUsefulness <= 0.5,
).length;
const verdict = wins > rows.length / 2 ? "PASS" : "FAIL";
console.log(`\n${verdict}: engine beat the prompt-matched single call on ${wins}/${rows.length} problems`);
await writeFile(values.out!, JSON.stringify({ verdict, wins, rows }, null, 2));
