import assert from "node:assert/strict";
import { test } from "node:test";
import { LexicalEmbedder } from "../src/embed/embedder.js";
import { LensBandit } from "../src/archive.js";
import { calibrate, gate } from "../src/stages/gate.js";
import { divergenceScore, selectPortfolio } from "../src/stages/score.js";
import { createRng, mapLimit, sampleBeta, distance } from "../src/util.js";
import { MeteredProvider, BudgetExceededError } from "../src/llm/provider.js";
import { ScriptedProvider } from "../src/llm/scripted.js";
import { z } from "zod";
import { OBVIOUS } from "./fixtures.js";

test("rng is deterministic per seed", () => {
  const a = createRng(1);
  const b = createRng(1);
  const c = createRng(2);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
});

test("beta samples stay in (0, 1) and track the posterior mean", () => {
  const rng = createRng(3);
  const draws = Array.from({ length: 2000 }, () => sampleBeta(rng, 8, 2));
  assert.ok(draws.every((d) => d > 0 && d < 1));
  const m = draws.reduce((s, x) => s + x, 0) / draws.length;
  assert.ok(Math.abs(m - 0.8) < 0.03, `mean ${m}`);
});

test("mapLimit preserves order and bounds concurrency", async () => {
  let live = 0;
  let peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5, 6], 2, async (x) => {
    live++;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live--;
    return x * 2;
  });
  assert.deepEqual(out, [2, 4, 6, 8, 10, 12]);
  assert.ok(peak <= 2);
});

test("gate rejects rewordings, banned words and duplicates; accepts remote ideas", async () => {
  const emb = new LexicalEmbedder();
  const wells = await emb.embed(OBVIOUS);
  const cal = calibrate(wells, "balanced");
  assert.ok(cal.spread > 0 && cal.duplicateThreshold < cal.gravityThreshold);
  const [reworded, remote, remote2] = await emb.embed([
    "Offer loyalty cards and discounts to the regular bakery customers",
    "Bakers rent their ovens overnight to ceramic artists who fire pottery between batches",
    "Bakers rent their ovens overnight to ceramic artists who fire pottery between bread batches",
  ]);
  const base = { wells, archive: [], peers: [], bannedWords: [], calibration: cal };
  assert.equal(gate({ ...base, vector: reworded!, text: "x" }).status, "rejected_gravity");
  assert.equal(gate({ ...base, vector: remote!, text: "x" }).status, "accepted");
  assert.equal(gate({ ...base, vector: remote2!, text: "x", peers: [remote!] }).status, "rejected_duplicate");
  assert.equal(gate({ ...base, vector: remote2!, text: "x", archive: [remote!] }).status, "rejected_archive");
  assert.equal(gate({ ...base, vector: remote!, text: "use blockchain here", bannedWords: ["blockchain"] }).status, "rejected_anchor_word");
});

test("temperament moves the gravity threshold in the right direction", async () => {
  const wells = await new LexicalEmbedder().embed(OBVIOUS);
  const g = calibrate(wells, "grounded").gravityThreshold;
  const b = calibrate(wells, "balanced").gravityThreshold;
  const w = calibrate(wells, "wild").gravityThreshold;
  assert.ok(g < b && b < w);
});

test("geometric score punishes a single weak axis", () => {
  const metrics = { wellDistance: 0.9, archiveDistance: 1, peerDistance: 1, remoteness: 3 };
  const strong = divergenceScore(metrics, { originality: 5, usefulness: 5, specificity: 5, rationale: "" }, "balanced");
  const useless = divergenceScore(metrics, { originality: 5, usefulness: 1, specificity: 5, rationale: "" }, "balanced");
  const conventional = divergenceScore({ ...metrics, remoteness: 0.2 }, { originality: 1, usefulness: 5, specificity: 5, rationale: "" }, "balanced");
  assert.ok(strong > 0.8);
  assert.ok(useless < strong * 0.6, `useless ${useless} vs strong ${strong}`);
  assert.ok(conventional < strong * 0.5);
  const wildUseless = divergenceScore(metrics, { originality: 5, usefulness: 1, specificity: 5, rationale: "" }, "wild");
  assert.ok(wildUseless > useless, "wild mode should tolerate low usefulness more");
});

test("MMR portfolio prefers a different idea over a near-duplicate of a better one", () => {
  const items = [
    { id: "a", score: 0.9, vector: [1, 0, 0] },
    { id: "a2", score: 0.88, vector: [0.99, 0.01, 0] },
    { id: "b", score: 0.7, vector: [0, 1, 0] },
  ];
  const picked = selectPortfolio(items, 2).map((x) => x.id);
  assert.deepEqual(picked, ["a", "b"]);
  assert.ok(distance([1, 0, 0], [0, 1, 0]) === 1);
});

test("lens bandit favours lenses that keep producing survivors", () => {
  const stats = {};
  const bandit = new LensBandit(stats, createRng(11));
  for (let i = 0; i < 20; i++) {
    bandit.record("inversion", 4, 0);
    bandit.record("scale-shift", 0, 4);
  }
  let inv = 0;
  let scale = 0;
  for (let i = 0; i < 200; i++) {
    const c = bandit.choose(3);
    if (c.includes("inversion")) inv++;
    if (c.includes("scale-shift")) scale++;
  }
  assert.ok(inv > 190, `inversion chosen ${inv}/200`);
  assert.ok(scale < 20, `scale-shift chosen ${scale}/200`);
});

test("metered provider enforces the ceiling before calling", async () => {
  const inner = new ScriptedProvider({ probe: () => ({ ok: true }) });
  const m = new MeteredProvider(inner, 2);
  const req = { role: "probe" as const, system: "", user: "", schema: z.object({ ok: z.boolean() }) };
  await m.structured(req);
  await m.structured(req);
  await assert.rejects(m.structured(req), BudgetExceededError);
  assert.equal(inner.log.length, 2);
});

test("scripted provider validates replies against the schema like the real API", async () => {
  const p = new ScriptedProvider({ probe: () => ({ wrong: 1 }) });
  await assert.rejects(p.structured({ role: "probe", system: "", user: "", schema: z.object({ ok: z.boolean() }) }));
});

test("ideaText never doubles a title that prefixes the mechanism", async () => {
  const { ideaText } = await import("../src/util.js");
  assert.equal(ideaText({ title: "Rent the ovens", mechanism: "Rent the ovens overnight" }), "Rent the ovens overnight");
  assert.equal(ideaText({ title: "Oven rental", mechanism: "Rent the ovens overnight" }), "Oven rental. Rent the ovens overnight");
});
