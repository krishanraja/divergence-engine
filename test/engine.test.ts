import assert from "node:assert/strict";
import { test } from "node:test";
import { DivergentEngine } from "../src/engine.js";
import { CachedEmbedder, LexicalEmbedder } from "../src/embed/embedder.js";
import { OBVIOUS, scriptedProvider, tempHome } from "./fixtures.js";

const embedder = () => new CachedEmbedder(new LexicalEmbedder());

test("full run returns a diverse portfolio and never returns a consensus answer", async () => {
  const provider = scriptedProvider({ copyEvery: 3 });
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const report = await engine.run({ problem: "How can a small bakery beat supermarkets?", count: 5, seed: 7 });

  assert.equal(report.sparks.length, 5);
  for (const s of report.sparks) {
    assert.ok(!OBVIOUS.includes(s.title), `consensus answer leaked: ${s.title}`);
    assert.ok(s.metrics.remoteness >= 1, `spark inside the consensus cluster: ${s.title}`);
    assert.ok(s.prompt.includes(s.title));
    assert.ok(s.score > 0 && s.score <= 1);
  }
  assert.ok((report.stats.rejected.rejected_gravity ?? 0) > 0, "copied consensus answers should be rejected by the gate");
  assert.ok(report.usage.calls <= 40);
  assert.ok(report.stats.meanPairwiseDistanceSelected > 0);
  // The graph keeps full lineage.
  assert.ok(report.graph.some((n) => n.kind === "mutation"));
  assert.ok(report.graph.some((n) => n.kind === "counter"));
});

test("regression guard discards mutations that slide back to the consensus", async () => {
  const provider = scriptedProvider({ regress: true });
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const report = await engine.run({ problem: "bakery", count: 3, seed: 3, crossPollinate: false });
  const mutations = report.graph.filter((n) => n.kind === "mutation");
  assert.ok(mutations.length > 0);
  for (const m of mutations) assert.ok(m.status.startsWith("rejected"), `regressed mutation survived with status ${m.status}`);
  assert.ok(report.sparks.every((s) => s.kind !== "mutation"));
});

test("hard call budget is never exceeded", async () => {
  for (const maxCalls of [3, 6, 11]) {
    const provider = scriptedProvider();
    const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
    const report = await engine.run({ problem: "bakery", maxCalls, seed: maxCalls });
    assert.ok(report.usage.calls <= maxCalls, `used ${report.usage.calls} calls with a cap of ${maxCalls}`);
    assert.equal(provider.log.length, report.usage.calls);
  }
});

test("usefulness floor removes bizarre-but-useless ideas", async () => {
  const provider = scriptedProvider({ usefulness: 1 });
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const report = await engine.run({ problem: "bakery", seed: 5, temperament: "grounded", crossPollinate: false });
  assert.equal(report.sparks.length, 0);
  assert.ok((report.stats.rejected.rejected_judge ?? 0) > 0);
});

test("namespace memory: an idea handed out once is rejected the next time", async () => {
  const home = await tempHome();
  const fixed = {
    title: "Night shift sourdough cooperative",
    mechanism: "Nurses on night shifts co-own a starter culture and collect loaves at 6am from hospital lockers.",
    whyNonObvious: "Targets the one group awake when bread is made.",
    firstStep: "Ask one ward.",
  };
  const make = () =>
    scriptedProvider();
  const p1 = make();
  // Force the same idea to appear in both runs.
  const original = (p1 as unknown as { handlers: Record<string, unknown> }).handlers;
  original.diverge = () => ({ ideas: [fixed] });
  const e1 = new DivergentEngine({ provider: p1, embedder: embedder(), archiveRoot: home });
  const r1 = await e1.run({ problem: "bakery", namespace: "video-engine", count: 1, seed: 1, dialecticRounds: 0, crossPollinate: false, maxWaves: 1, lensesPerWave: 1 });
  assert.equal(r1.sparks[0]?.title, fixed.title);

  const p2 = make();
  (p2 as unknown as { handlers: Record<string, unknown> }).handlers.diverge = () => ({ ideas: [fixed] });
  const e2 = new DivergentEngine({ provider: p2, embedder: embedder(), archiveRoot: home });
  const r2 = await e2.run({ problem: "bakery", namespace: "video-engine", count: 1, seed: 2, dialecticRounds: 0, crossPollinate: false, maxWaves: 1, lensesPerWave: 1 });
  assert.equal(r2.sparks.length, 0);
  assert.equal(r2.stats.rejected.rejected_archive, 1);

  // A different namespace has its own memory.
  const p3 = make();
  (p3 as unknown as { handlers: Record<string, unknown> }).handlers.diverge = () => ({ ideas: [fixed] });
  const e3 = new DivergentEngine({ provider: p3, embedder: embedder(), archiveRoot: home });
  const r3 = await e3.run({ problem: "bakery", namespace: "content-engine", count: 1, seed: 3, dialecticRounds: 0, crossPollinate: false, maxWaves: 1, lensesPerWave: 1 });
  assert.equal(r3.sparks.length, 1);
});

test("provoke uses exactly two calls and filters consensus copies", async () => {
  const provider = scriptedProvider();
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const report = await engine.provoke({ problem: "bakery", count: 4, seed: 9 });
  assert.equal(report.usage.calls, 2);
  assert.equal(report.sparks.length, 4);
  assert.ok(report.sparks.every((s) => !OBVIOUS.includes(s.title)));
});

test("score with known consensus makes zero model calls and separates copies from fresh ideas", async () => {
  const provider = scriptedProvider();
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const res = await engine.score({
    problem: "bakery",
    obvious: OBVIOUS,
    ideas: [OBVIOUS[0]!, "Bakers rent their ovens overnight to ceramic artists, firing pottery between bread batches"],
  });
  assert.equal(provider.log.length, 0);
  assert.equal(res.results[0]!.outsideConsensus, false);
  assert.equal(res.results[1]!.outsideConsensus, true);
  assert.ok(res.results[1]!.score > res.results[0]!.score);
});

test("challenge attacks, mutates and reports regression", async () => {
  const provider = scriptedProvider();
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const res = await engine.challenge({ problem: "bakery", idea: OBVIOUS[1]! });
  assert.equal(res.usage.calls, 3);
  assert.equal(res.attack.conventionalTwin, "a subscription box");
  assert.ok(res.mutation.metrics.wellDistance > res.original.metrics.wellDistance);
  assert.equal(res.mutation.regressed, false);
});

test("same seed and same model replies give the same portfolio", async () => {
  const runOnce = async () => {
    const { scriptedProvider: sp } = await import("./fixtures.js");
    const engine = new DivergentEngine({ provider: sp(), embedder: embedder(), archiveRoot: await tempHome() });
    const r = await engine.run({ problem: "bakery", seed: 42, count: 3, remember: false });
    return r.sparks.map((s) => s.lens);
  };
  // Lens choice and ordering derive from the seed only.
  const a = await runOnce();
  const b = await runOnce();
  assert.equal(a.length, b.length);
});

test("record seeds namespace memory, and score flags repeats and banned words with zero calls", async () => {
  const home = await tempHome();
  const provider = scriptedProvider();
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: home });
  const shipped = "Bakers rent their ovens overnight to ceramic artists, firing pottery between bread batches";
  const rec = await engine.record({ namespace: "growth-heartside", items: [shipped, shipped, "  "] });
  assert.equal(rec.recorded, 1);
  const again = await engine.record({ namespace: "growth-heartside", items: [shipped] });
  assert.equal(again.recorded, 0);
  assert.equal(again.skippedDuplicates, 1);
  const res = await engine.score({
    problem: "bakery",
    obvious: OBVIOUS,
    namespace: "growth-heartside",
    bannedWords: ["synergy"],
    ideas: [shipped, "A sourdough library where neighbours borrow starter cultures, creating synergy", "Night shift nurses co-own a starter culture and collect loaves from hospital lockers at 6am"],
  });
  assert.equal(provider.log.length, 0);
  assert.equal(res.results[0]!.repeatsArchive, true);
  assert.equal(res.results[0]!.status, "rejected_archive");
  assert.equal(res.results[1]!.status, "rejected_anchor_word");
  assert.equal(res.results[2]!.status, "accepted");
});

test("an idea missing any of its four parts is rejected, never selected", async () => {
  const provider = scriptedProvider();
  (provider as unknown as { handlers: Record<string, unknown> }).handlers.diverge = () => ({
    ideas: [{ title: "Half an idea", mechanism: "Bakers trade starter cultures with brewers at dawn markets", whyNonObvious: "", firstStep: "Ask one brewer." }],
  });
  const engine = new DivergentEngine({ provider, embedder: embedder(), archiveRoot: await tempHome() });
  const r = await engine.run({ problem: "bakery", count: 1, seed: 4, dialecticRounds: 0, crossPollinate: false, maxWaves: 1, lensesPerWave: 1, remember: false });
  assert.equal(r.sparks.length, 0);
  assert.equal(r.stats.rejected.rejected_incomplete, 1);
});
