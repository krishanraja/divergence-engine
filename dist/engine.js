import { Archive, FileMemoryStore, LensBandit } from "./archive.js";
import { LENSES, lensByName } from "./lenses.js";
import { BudgetExceededError, MeteredProvider } from "./llm/provider.js";
import { AttackSchema, BlendSchema, ConsensusSchema, IdeasSchema, JudgeSchema, MutationSchema, attackPrompt, blendPrompt, divergePrompt, downstreamPrompt, judgePrompt, mutatePrompt, probePrompt, provokePrompt, } from "./prompts.js";
import { calibrate, gate } from "./stages/gate.js";
import { USEFULNESS_FLOOR, divergenceScore, selectPortfolio } from "./stages/score.js";
import { clamp, createRng, distance, ideaText, mapLimit, mean, shortId, shuffle } from "./util.js";
const DEFAULTS = {
    count: 5,
    ideasPerLens: 4,
    lensesPerWave: 4,
    maxWaves: 3,
    dialecticRounds: 1,
    dialecticBeam: 6,
    judgePasses: 2,
    crossPollinate: true,
    maxCalls: 40,
    target: "generic",
    temperament: "balanced",
    namespace: "default",
    remember: true,
};
const JUDGE_CHUNK = 12;
const CONSENSUS_SIZE = 10;
/** Mutable state for one run. Kept in one place so every stage reads the same truth. */
class Run {
    rng;
    emit;
    nodes = new Map();
    vectors = new Map();
    wells = [];
    archive = [];
    calibration;
    consensus = { obvious: [], orthodoxies: [] };
    warnings = [];
    attacked = new Set();
    constructor(rng, emit) {
        this.rng = rng;
        this.emit = emit;
    }
    newId() {
        let id = shortId(this.rng);
        while (this.nodes.has(id))
            id = shortId(this.rng);
        return id;
    }
    accepted() {
        return [...this.nodes.values()].filter((n) => n.status === "accepted");
    }
    warn(message) {
        this.warnings.push(message);
        this.emit({ type: "warning", message });
    }
}
export class DivergentEngine {
    deps;
    store;
    constructor(deps) {
        this.deps = deps;
        this.store = deps.store ?? new FileMemoryStore(deps.archiveRoot);
    }
    /**
     * Full pipeline: map the consensus, diverge through lenses in waves, gate for novelty,
     * attack and mutate the best survivors, judge blind, then select a diverse portfolio.
     */
    async run(options) {
        const started = Date.now();
        const opts = { ...DEFAULTS, ...stripUndefined(options), problem: options.problem };
        const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
        const rng = createRng(seed);
        const emit = options.onEvent ?? (() => { });
        // A time budget keeps a run inside a host's limit (a serverless function's maximum
        // duration). Generation stops first, then the dialectic, then the hybrid; judging
        // runs unless almost nothing is left. Unset means no limit.
        const budgetMs = options.timeBudgetMs;
        const past = (share) => budgetMs !== undefined && Date.now() - started > budgetMs * share;
        const run = new Run(rng, emit);
        const llm = new MeteredProvider(this.deps.provider, opts.maxCalls);
        const embedder = this.deps.embedder;
        const archive = new Archive(opts.namespace, this.store);
        await archive.load(embedder);
        run.archive = archive.vectors();
        const bandit = new LensBandit(archive.lenses, rng);
        const lensYield = {};
        let stopReason = "completed";
        // Stage 1: map the consensus. This is the gravity the rest of the run escapes from.
        emit({ type: "stage", stage: "probe" });
        run.consensus = await this.probe(llm, opts.problem, opts.context);
        const wellTexts = [...run.consensus.obvious, ...(opts.cliches ?? [])];
        run.wells = await embedder.embed(wellTexts);
        run.calibration = calibrate(run.wells, opts.temperament, this.deps.gateFactors, embedder.id);
        // Reserve budget for the convergent half of the pipeline before spending on waves.
        const judgeCallsEstimate = opts.judgePasses * Math.ceil(Math.max(opts.count * 3, 1) / JUDGE_CHUNK);
        const reserve = opts.dialecticRounds * Math.min(opts.dialecticBeam, opts.count * 2) * 2 + judgeCallsEstimate + (opts.crossPollinate ? 2 : 0);
        const poolTarget = Math.max(opts.count * 3, opts.dialecticBeam);
        // Stage 2: divergence waves with a lens bandit and escalating avoid lists.
        let wave = 0;
        for (; wave < opts.maxWaves; wave++) {
            const accepted = run.accepted();
            if (accepted.length >= poolTarget)
                break;
            if (past(0.5)) {
                stopReason = "time budget: generation stopped at half the budget";
                break;
            }
            const affordable = llm.remaining - reserve;
            if (affordable < 1) {
                stopReason = "budget reserved for dialectic and judging";
                break;
            }
            const k = Math.min(opts.lensesPerWave, affordable);
            const lensNames = options.lenses && options.lenses.length
                ? shuffle(rng, options.lenses.filter((n) => lensByName(n))).slice(0, k)
                : bandit.choose(k);
            emit({ type: "stage", stage: "diverge", detail: `wave ${wave + 1}: ${lensNames.join(", ")}` });
            const avoid = [
                ...run.consensus.obvious,
                ...(opts.cliches ?? []),
                ...accepted.map((n) => n.idea.title),
                ...archive.sparks.slice(-15).map((s) => s.title),
            ].slice(0, 40);
            const batches = await mapLimit(lensNames, this.deps.concurrency ?? 4, async (lensName) => {
                const lens = lensByName(lensName);
                const { instruction, stimulus } = lens.operator({ rng, consensus: run.consensus });
                try {
                    const res = await llm.structured({
                        role: "diverge",
                        schema: IdeasSchema,
                        ...divergePrompt({
                            problem: opts.problem,
                            context: opts.context,
                            instruction,
                            avoid,
                            bannedWords: opts.bannedWords ?? [],
                            count: opts.ideasPerLens,
                        }),
                    });
                    return { lensName, stimulus, ideas: res.data.ideas };
                }
                catch (err) {
                    if (err instanceof BudgetExceededError)
                        throw err;
                    run.warn(`lens ${lensName} failed: ${err.message}`);
                    return { lensName, stimulus, ideas: [] };
                }
            });
            let waveGenerated = 0;
            let waveAccepted = 0;
            for (const b of batches) {
                let survived = 0;
                for (const idea of b.ideas) {
                    waveGenerated++;
                    const node = await this.admit(run, embedder, {
                        kind: "seed",
                        parents: ["root"],
                        lens: b.lensName,
                        stimulus: b.stimulus,
                        wave: wave + 1,
                        idea,
                        bannedWords: opts.bannedWords ?? [],
                    });
                    if (node.status === "accepted")
                        survived++;
                }
                waveAccepted += survived;
                bandit.record(b.lensName, survived, b.ideas.length - survived);
                const y = (lensYield[b.lensName] ??= { tried: 0, survived: 0 });
                y.tried += b.ideas.length;
                y.survived += survived;
            }
            emit({ type: "wave", wave: wave + 1, accepted: waveAccepted, generated: waveGenerated });
            if (waveGenerated > 0 && waveAccepted / waveGenerated < 0.2) {
                run.warn(`wave ${wave + 1} stagnated (${waveAccepted}/${waveGenerated} survived); escalating with new lenses`);
            }
        }
        if (wave >= opts.maxWaves && stopReason === "completed")
            stopReason = "max waves reached";
        // Stage 3: dialectic. Attack the most remote survivors, then mutate under a regression guard.
        try {
            for (let round = 0; round < opts.dialecticRounds; round++) {
                if (past(0.7)) {
                    run.warn("time budget: dialectic skipped");
                    break;
                }
                const beam = run
                    .accepted()
                    .filter((n) => n.kind !== "counter" && !run.attacked.has(n.id))
                    .sort((a, b) => b.metrics.remoteness - a.metrics.remoteness)
                    .slice(0, Math.min(opts.dialecticBeam, Math.floor((llm.remaining - judgeCallsEstimate) / 2)));
                if (!beam.length)
                    break;
                emit({ type: "stage", stage: "dialectic", detail: `round ${round + 1}, ${beam.length} theses` });
                await mapLimit(beam, this.deps.concurrency ?? 4, (n) => this.dialectic(run, llm, embedder, opts, n));
            }
        }
        catch (err) {
            if (!(err instanceof BudgetExceededError))
                throw err;
            run.warn("budget exhausted during dialectic; judging what survived");
        }
        // Stage 4: blind judging with shuffled passes, then the usefulness floor.
        emit({ type: "stage", stage: "judge" });
        if (past(0.92))
            run.warn("time budget: judging skipped; ranked on remoteness only");
        else
            await this.judge(run, llm, opts.problem, run.accepted(), past(0.8) ? 1 : opts.judgePasses);
        const floor = USEFULNESS_FLOOR[opts.temperament];
        for (const n of run.accepted()) {
            if (n.judge && n.judge.usefulness < floor) {
                n.status = "rejected_judge";
                if (n.kind === "seed")
                    bandit.record(n.lens, 0, 1);
            }
            n.score = divergenceScore(n.metrics, n.judge, opts.temperament);
        }
        // Stage 5: portfolio selection, then one cross-pollinated hybrid if it earns a place.
        emit({ type: "stage", stage: "select" });
        let portfolio = this.select(run, opts.count);
        if (opts.crossPollinate && portfolio.length >= 2 && llm.remaining >= 2 && !past(0.85)) {
            try {
                const hybrid = await this.crossPollinate(run, llm, embedder, opts, portfolio);
                if (hybrid)
                    portfolio = this.select(run, opts.count);
            }
            catch (err) {
                if (!(err instanceof BudgetExceededError))
                    throw err;
            }
        }
        for (const n of portfolio)
            n.status = "selected";
        const sparks = portfolio.map((n, i) => this.toSpark(run, n, i + 1, opts.target, opts.problem));
        if (opts.remember) {
            await archive.remember(portfolio.map((n) => ({
                text: ideaText(n.idea),
                title: n.idea.title,
                runId: String(seed),
                embedder: embedder.id,
                vector: run.vectors.get(n.id),
            })));
        }
        await archive.saveLensStats();
        const all = [...run.nodes.values()];
        const rejected = {};
        for (const n of all)
            if (n.status.startsWith("rejected"))
                rejected[n.status] = (rejected[n.status] ?? 0) + 1;
        const selVecs = portfolio.map((n) => run.vectors.get(n.id));
        const pairwise = [];
        for (let i = 0; i < selVecs.length; i++)
            for (let j = i + 1; j < selVecs.length; j++)
                pairwise.push(distance(selVecs[i], selVecs[j]));
        return {
            runId: String(seed),
            namespace: opts.namespace,
            problem: opts.problem,
            target: opts.target,
            temperament: opts.temperament,
            seed,
            consensus: run.consensus,
            calibration: run.calibration,
            sparks,
            stats: {
                waves: wave,
                generated: all.filter((n) => n.kind !== "root").length,
                accepted: all.filter((n) => ["accepted", "selected", "superseded"].includes(n.status)).length,
                rejected,
                lensYield,
                meanRemotenessSelected: mean(portfolio.map((n) => n.metrics.remoteness)),
                meanPairwiseDistanceSelected: mean(pairwise),
                stopReason: run.warnings.length ? `${stopReason}; warnings: ${run.warnings.length}` : stopReason,
            },
            usage: {
                calls: llm.calls,
                inputTokens: llm.inputTokens,
                outputTokens: llm.outputTokens,
                estimatedCostUsd: Math.round(llm.costUsd * 10000) / 10000,
            },
            graph: all.map(({ embedding: _e, ...rest }) => rest),
            embedder: embedder.id,
            durationMs: Date.now() - started,
        };
    }
    /**
     * Cheap mode for high-frequency callers: one consensus call, one multi-lens call,
     * novelty gate, portfolio. Two model calls, no dialectic, no judge.
     */
    async provoke(options) {
        const count = options.count ?? 5;
        return this.runLite(options, count, async (run, llm) => {
            const lenses = shuffle(run.rng, LENSES).slice(0, 4);
            const block = lenses
                .map((l) => {
                const op = l.operator({ rng: run.rng, consensus: run.consensus });
                return `- ${l.name}: ${op.instruction}`;
            })
                .join("\n");
            const res = await llm.structured({
                role: "provoke",
                schema: IdeasSchema,
                ...provokePrompt(options.problem, options.context, block, [...run.consensus.obvious, ...(options.cliches ?? [])], count * 3),
            });
            return res.data.ideas.map((idea) => ({ idea, lens: "multi" }));
        });
    }
    /** Map only: what everyone else will say, and the assumptions they share. One call. */
    async mapConsensus(problem, context, provider = this.deps.provider) {
        return this.probe(new MeteredProvider(provider, 1), problem, context);
    }
    /**
     * Measure how divergent a set of ideas is, without generating anything.
     * This is the engine as a critic: other engines can send their outputs here to find
     * out whether they are producing the consensus in disguise.
     */
    async score(args) {
        const embedder = this.deps.embedder;
        const temperament = args.temperament ?? "balanced";
        const llm = new MeteredProvider(this.deps.provider, 4);
        const consensus = args.obvious?.length ? { obvious: args.obvious, orthodoxies: [] } : await this.probe(llm, args.problem);
        const wells = await embedder.embed(consensus.obvious);
        const cal = calibrate(wells, temperament, this.deps.gateFactors, embedder.id);
        const archive = new Archive(args.namespace ?? "default", this.store);
        await archive.load(embedder);
        const drafts = args.ideas.map((i) => typeof i === "string" ? { title: i.slice(0, 80), mechanism: i, whyNonObvious: "", firstStep: "" } : i);
        const vecs = await embedder.embed(drafts.map(ideaText));
        let judged;
        if (args.judge) {
            const run = new Run(createRng(1), () => { });
            run.consensus = consensus;
            const nodes = drafts.map((idea, i) => ({ id: `i${i}`, idea }));
            judged = await this.judgeMap(run, llm, args.problem, nodes, 1);
        }
        const results = drafts.map((idea, i) => {
            const others = vecs.filter((_, j) => j !== i);
            const { metrics, status } = gate({
                vector: vecs[i],
                text: `${ideaText(idea)} ${idea.whyNonObvious} ${idea.firstStep}`,
                wells,
                archive: archive.vectors(),
                peers: others,
                bannedWords: args.bannedWords ?? [],
                calibration: cal,
            });
            const judge = judged?.get(`i${i}`);
            return {
                title: idea.title,
                /** The gate's verdict: accepted, or the first reason it would be rejected. */
                status,
                outsideConsensus: metrics.wellDistance >= cal.gravityThreshold,
                /** True when this namespace has already shipped or been handed something this close. */
                repeatsArchive: metrics.archiveDistance < cal.duplicateThreshold,
                metrics,
                judge,
                score: divergenceScore(metrics, judge, temperament),
            };
        });
        return {
            consensus,
            calibration: cal,
            /** Fewer than five consensus answers gives a noisy spread estimate. */
            calibrationReliable: consensus.obvious.length >= 5,
            divergenceIndex: mean(results.map((r) => r.score)),
            shareOutsideConsensus: results.filter((r) => r.outsideConsensus).length / Math.max(1, results.length),
            results,
            usage: { calls: llm.calls, estimatedCostUsd: llm.costUsd },
            embedder: embedder.id,
        };
    }
    /**
     * Record outputs a consuming engine actually shipped (posts, hooks, plays), so later
     * runs in that namespace treat them as already used. Zero model calls.
     * Send de-identified text only: the archive is plain files on the host running the engine.
     */
    async record(args) {
        const embedder = this.deps.embedder;
        const archive = new Archive(args.namespace, this.store);
        await archive.load(embedder);
        const items = args.items
            .map((i) => (typeof i === "string" ? { title: i.slice(0, 80), mechanism: i } : { title: i.title, mechanism: i.mechanism ?? i.title }))
            .filter((i) => i.mechanism.trim());
        const texts = items.map(ideaText);
        const existing = new Set(archive.sparks.map((s) => s.text));
        const fresh = items
            .map((it, i) => ({ it, text: texts[i] }))
            .filter((x) => {
            if (existing.has(x.text))
                return false;
            existing.add(x.text);
            return true;
        });
        const vecs = await embedder.embed(fresh.map((f) => f.text));
        await archive.remember(fresh.map((f, i) => ({ text: f.text, title: f.it.title, runId: args.label ?? "recorded", embedder: embedder.id, vector: vecs[i] })));
        return { namespace: args.namespace, recorded: fresh.length, skippedDuplicates: items.length - fresh.length, archiveSize: archive.sparks.length };
    }
    /**
     * Push an existing idea or plan: attack it, then return a mutation that keeps its
     * strange core and moves further from the consensus. Three calls.
     */
    async challenge(args) {
        const llm = new MeteredProvider(this.deps.provider, 3);
        const embedder = this.deps.embedder;
        const consensus = await this.probe(llm, args.problem, args.context);
        const idea = typeof args.idea === "string"
            ? { title: args.idea.slice(0, 80), mechanism: args.idea, whyNonObvious: "", firstStep: "" }
            : args.idea;
        const attack = (await llm.structured({ role: "adversary", schema: AttackSchema, ...attackPrompt(args.problem, idea, consensus.obvious) })).data;
        const mut = (await llm.structured({
            role: "synthesize",
            schema: MutationSchema,
            ...mutatePrompt(args.problem, idea, attack.conventionalTwin, attack.fatalFlaw, consensus.obvious),
        })).data;
        const wells = await embedder.embed(consensus.obvious);
        const cal = calibrate(wells, "balanced", this.deps.gateFactors, embedder.id);
        const [vOrig, vMut, vCounter] = await embedder.embed([ideaText(idea), ideaText(mut.idea), ideaText(attack.counterIdea)]);
        const archive = new Archive(args.namespace ?? "default", this.store);
        await archive.load(embedder);
        const measure = (v) => gate({ vector: v, text: "", wells, archive: archive.vectors(), peers: [], bannedWords: [], calibration: cal }).metrics;
        const original = measure(vOrig);
        const mutation = measure(vMut);
        return {
            consensus,
            attack,
            original: { idea, metrics: original },
            mutation: {
                idea: mut.idea,
                rationale: mut.rationale,
                metrics: mutation,
                regressed: mutation.wellDistance < original.wellDistance,
                prompt: downstreamPrompt(args.target ?? "generic", args.problem, mut.idea, attack.conventionalTwin, attack.fatalFlaw),
            },
            counter: { idea: attack.counterIdea, metrics: measure(vCounter) },
            usage: { calls: llm.calls, estimatedCostUsd: llm.costUsd },
        };
    }
    // ---------------------------------------------------------------- internals
    async probe(llm, problem, context) {
        const res = await llm.structured({ role: "probe", schema: ConsensusSchema, ...probePrompt(problem, context, CONSENSUS_SIZE) });
        const clean = (xs) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];
        return { obvious: clean(res.data.obvious), orthodoxies: clean(res.data.orthodoxies) };
    }
    /** Create a node, embed it, and pass it through the novelty gate. */
    async admit(run, embedder, args) {
        const id = run.newId();
        const text = ideaText(args.idea);
        const [vector] = await embedder.embed([text]);
        const ignore = new Set(args.ignorePeers ?? []);
        const peers = run.accepted().filter((n) => !ignore.has(n.id)).map((n) => run.vectors.get(n.id));
        const { status, metrics } = gate({
            vector: vector,
            text: `${text} ${args.idea.whyNonObvious} ${args.idea.firstStep}`,
            wells: run.wells,
            archive: run.archive,
            peers,
            bannedWords: args.bannedWords,
            calibration: run.calibration,
        });
        // An idea missing any of its four parts never reaches a person half-written
        // (first live runs, 18 November: one spark came back with no reason it was non-obvious).
        const incomplete = [args.idea.title, args.idea.mechanism, args.idea.whyNonObvious, args.idea.firstStep].some((f) => !f || !f.trim());
        const node = {
            id,
            kind: args.kind,
            parents: args.parents,
            lens: args.lens,
            stimulus: args.stimulus,
            wave: args.wave,
            idea: args.idea,
            status: incomplete && status === "accepted" ? "rejected_incomplete" : status,
            metrics,
        };
        run.nodes.set(id, node);
        run.vectors.set(id, vector);
        run.emit({ type: "node", node: { id, kind: node.kind, lens: node.lens, status: node.status, title: args.idea.title } });
        return node;
    }
    async dialectic(run, llm, embedder, opts, thesis) {
        run.attacked.add(thesis.id);
        const avoid = [...run.consensus.obvious, ...(opts.cliches ?? [])];
        let attack;
        try {
            attack = (await llm.structured({ role: "adversary", schema: AttackSchema, ...attackPrompt(opts.problem, thesis.idea, avoid) })).data;
        }
        catch (err) {
            if (err instanceof BudgetExceededError)
                throw err;
            run.warn(`attack on ${thesis.id} failed: ${err.message}`);
            return;
        }
        thesis.dialectic = { conventionalTwin: attack.conventionalTwin, fatalFlaw: attack.fatalFlaw, counterIdea: attack.counterIdea.title };
        // The adversary's counter-proposal is itself a candidate. Debate generates, not just filters.
        const counter = await this.admit(run, embedder, {
            kind: "counter",
            parents: [thesis.id],
            lens: `counter:${thesis.lens}`,
            wave: thesis.wave,
            idea: attack.counterIdea,
            bannedWords: opts.bannedWords ?? [],
        });
        if (counter.status === "accepted")
            thesis.dialectic.counterNodeId = counter.id;
        let mutation;
        try {
            mutation = (await llm.structured({
                role: "synthesize",
                schema: MutationSchema,
                ...mutatePrompt(opts.problem, thesis.idea, attack.conventionalTwin, attack.fatalFlaw, avoid),
            })).data;
        }
        catch (err) {
            if (err instanceof BudgetExceededError)
                throw err;
            run.warn(`mutation of ${thesis.id} failed: ${err.message}`);
            return;
        }
        const child = await this.admit(run, embedder, {
            kind: "mutation",
            parents: [thesis.id],
            lens: thesis.lens,
            stimulus: thesis.stimulus,
            wave: thesis.wave,
            idea: mutation.idea,
            bannedWords: opts.bannedWords ?? [],
            ignorePeers: [thesis.id],
        });
        child.dialectic = {
            conventionalTwin: attack.conventionalTwin,
            fatalFlaw: attack.fatalFlaw,
            mutationRationale: mutation.rationale,
        };
        // Regression guard: dialectical synthesis tends to split the difference with the
        // mainstream. A synthesis that moved toward the consensus is discarded and the thesis kept.
        const slid = child.metrics.wellDistance < thesis.metrics.wellDistance - 0.1 * run.calibration.spread;
        if (child.status === "accepted" && slid) {
            child.status = "rejected_regression";
            child.dialectic.regressed = true;
        }
        if (child.status === "accepted")
            thesis.status = "superseded";
    }
    async judge(run, llm, problem, nodes, passes) {
        if (!nodes.length)
            return;
        try {
            const scores = await this.judgeMap(run, llm, problem, nodes, passes);
            for (const n of nodes) {
                const s = scores.get(n.id);
                if (s)
                    n.judge = s;
            }
        }
        catch (err) {
            if (!(err instanceof BudgetExceededError))
                throw err;
            run.warn("budget exhausted before judging finished; unjudged ideas ranked on remoteness only");
        }
    }
    async judgeMap(run, llm, problem, nodes, passes) {
        const acc = new Map();
        for (let p = 0; p < passes; p++) {
            const order = shuffle(run.rng, nodes);
            for (let i = 0; i < order.length; i += JUDGE_CHUNK) {
                const chunk = order.slice(i, i + JUDGE_CHUNK);
                let res;
                try {
                    res = await llm.structured({
                        role: "judge",
                        schema: JudgeSchema,
                        ...judgePrompt(problem, run.consensus.obvious, chunk.map((n) => ({ id: n.id, idea: n.idea }))),
                    });
                }
                catch (err) {
                    if (err instanceof BudgetExceededError) {
                        if (acc.size)
                            break;
                        throw err;
                    }
                    run.warn(`judge pass ${p + 1} failed: ${err.message}`);
                    continue;
                }
                for (const s of res.data.scores) {
                    if (!chunk.some((n) => n.id === s.id))
                        continue;
                    const a = acc.get(s.id) ?? { o: [], u: [], s: [], r: [] };
                    a.o.push(clamp(s.originality, 1, 5));
                    a.u.push(clamp(s.usefulness, 1, 5));
                    a.s.push(clamp(s.specificity, 1, 5));
                    a.r.push(s.rationale);
                    acc.set(s.id, a);
                }
            }
        }
        const out = new Map();
        for (const [id, a] of acc) {
            out.set(id, { originality: mean(a.o), usefulness: mean(a.u), specificity: mean(a.s), rationale: a.r[0] ?? "" });
        }
        return out;
    }
    select(run, count) {
        const pool = run
            .accepted()
            .concat([...run.nodes.values()].filter((n) => n.status === "selected"))
            .map((n) => ({ node: n, score: n.score ?? 0, vector: run.vectors.get(n.id) }));
        return selectPortfolio(pool, count).map((p) => p.node);
    }
    async crossPollinate(run, llm, embedder, opts, portfolio) {
        let best = null;
        let bestVal = -1;
        for (let i = 0; i < portfolio.length; i++) {
            for (let j = i + 1; j < portfolio.length; j++) {
                const a = portfolio[i];
                const b = portfolio[j];
                const val = ((a.score ?? 0) + (b.score ?? 0)) * distance(run.vectors.get(a.id), run.vectors.get(b.id));
                if (val > bestVal) {
                    bestVal = val;
                    best = [a, b];
                }
            }
        }
        if (!best)
            return null;
        const [a, b] = best;
        emit(run, "cross-pollinate", `${a.idea.title} x ${b.idea.title}`);
        const res = await llm.structured({
            role: "blend",
            schema: BlendSchema,
            ...blendPrompt(opts.problem, a.idea, b.idea, [...run.consensus.obvious, ...(opts.cliches ?? [])]),
        });
        const hybrid = await this.admit(run, embedder, {
            kind: "hybrid",
            parents: [a.id, b.id],
            lens: `${a.lens}+${b.lens}`,
            wave: Math.max(a.wave, b.wave),
            idea: res.data.idea,
            bannedWords: opts.bannedWords ?? [],
            ignorePeers: [a.id, b.id],
        });
        if (hybrid.status !== "accepted")
            return null;
        await this.judge(run, llm, opts.problem, [hybrid], 1);
        if (hybrid.judge && hybrid.judge.usefulness < USEFULNESS_FLOOR[opts.temperament]) {
            hybrid.status = "rejected_judge";
            return null;
        }
        hybrid.score = divergenceScore(hybrid.metrics, hybrid.judge, opts.temperament);
        return hybrid;
    }
    toSpark(run, n, rank, target, problem) {
        const lineage = [];
        const walk = (id) => {
            const node = run.nodes.get(id);
            if (!node)
                return;
            node.parents.forEach(walk);
            lineage.push(`${node.kind}:${node.id} ${node.idea.title}`);
        };
        walk(n.id);
        const d = n.dialectic ?? (n.parents[0] ? run.nodes.get(n.parents[0])?.dialectic : undefined);
        return {
            id: n.id,
            rank,
            title: n.idea.title,
            mechanism: n.idea.mechanism,
            whyNonObvious: n.idea.whyNonObvious,
            firstStep: n.idea.firstStep,
            lens: n.lens,
            stimulus: n.stimulus,
            kind: n.kind,
            lineage,
            conventionalTwin: d?.conventionalTwin,
            survivedAttack: n.kind === "mutation" ? d?.fatalFlaw : undefined,
            score: Math.round((n.score ?? 0) * 1000) / 1000,
            metrics: roundMetrics(n.metrics),
            judge: n.judge,
            prompt: downstreamPrompt(target, problem, n.idea, d?.conventionalTwin, n.kind === "mutation" ? undefined : d?.fatalFlaw),
        };
    }
    /** Shared skeleton for the two-call provoke mode. */
    async runLite(options, count, generate) {
        const started = Date.now();
        const seed = options.seed ?? Math.floor(Math.random() * 2 ** 31);
        const run = new Run(createRng(seed), () => { });
        const llm = new MeteredProvider(this.deps.provider, 2);
        const embedder = this.deps.embedder;
        const namespace = options.namespace ?? "default";
        const archive = new Archive(namespace, this.store);
        await archive.load(embedder);
        run.archive = archive.vectors();
        run.consensus = await this.probe(llm, options.problem, options.context);
        run.wells = await embedder.embed([...run.consensus.obvious, ...(options.cliches ?? [])]);
        run.calibration = calibrate(run.wells, "balanced", this.deps.gateFactors, embedder.id);
        const drafts = await generate(run, llm);
        for (const d of drafts) {
            const n = await this.admit(run, embedder, { kind: "seed", parents: ["root"], lens: d.lens, wave: 1, idea: d.idea, bannedWords: options.bannedWords ?? [] });
            n.score = divergenceScore(n.metrics, undefined, "balanced");
        }
        const portfolio = this.select(run, count);
        for (const n of portfolio)
            n.status = "selected";
        const target = options.target ?? "generic";
        const sparks = portfolio.map((n, i) => this.toSpark(run, n, i + 1, target, options.problem));
        if (options.remember ?? true) {
            await archive.remember(portfolio.map((n) => ({ text: ideaText(n.idea), title: n.idea.title, runId: String(seed), embedder: embedder.id, vector: run.vectors.get(n.id) })));
        }
        const all = [...run.nodes.values()];
        const rejected = {};
        for (const n of all)
            if (n.status.startsWith("rejected"))
                rejected[n.status] = (rejected[n.status] ?? 0) + 1;
        const selVecs = portfolio.map((n) => run.vectors.get(n.id));
        const pairwise = [];
        for (let i = 0; i < selVecs.length; i++)
            for (let j = i + 1; j < selVecs.length; j++)
                pairwise.push(distance(selVecs[i], selVecs[j]));
        return {
            runId: String(seed),
            namespace,
            problem: options.problem,
            target,
            temperament: "balanced",
            seed,
            consensus: run.consensus,
            calibration: run.calibration,
            sparks,
            stats: {
                waves: 1,
                generated: all.length,
                accepted: portfolio.length,
                rejected,
                lensYield: {},
                meanRemotenessSelected: mean(portfolio.map((n) => n.metrics.remoteness)),
                meanPairwiseDistanceSelected: mean(pairwise),
                stopReason: "provoke",
            },
            usage: { calls: llm.calls, inputTokens: llm.inputTokens, outputTokens: llm.outputTokens, estimatedCostUsd: Math.round(llm.costUsd * 10000) / 10000 },
            graph: all.map(({ embedding: _e, ...rest }) => rest),
            embedder: embedder.id,
            durationMs: Date.now() - started,
        };
    }
}
function emit(run, stage, detail) {
    run.emit({ type: "stage", stage, detail });
}
function roundMetrics(m) {
    const r = (x) => Math.round(x * 1000) / 1000;
    return { wellDistance: r(m.wellDistance), archiveDistance: r(m.archiveDistance), peerDistance: r(m.peerDistance), remoteness: r(m.remoteness) };
}
function stripUndefined(o) {
    return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
//# sourceMappingURL=engine.js.map