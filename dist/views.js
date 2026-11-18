/** Compact payload for agents: everything needed to act, nothing that wastes context. */
export function compactReport(r) {
    return {
        runId: r.runId,
        namespace: r.namespace,
        consensus: r.consensus,
        sparks: r.sparks.map((s) => ({
            rank: s.rank,
            title: s.title,
            mechanism: s.mechanism,
            whyNonObvious: s.whyNonObvious,
            firstStep: s.firstStep,
            lens: s.lens,
            kind: s.kind,
            conventionalTwin: s.conventionalTwin,
            survivedAttack: s.survivedAttack,
            score: s.score,
            remoteness: s.metrics.remoteness,
            judge: s.judge && {
                originality: round(s.judge.originality),
                usefulness: round(s.judge.usefulness),
                specificity: round(s.judge.specificity),
            },
            prompt: s.prompt,
        })),
        stats: {
            generated: r.stats.generated,
            accepted: r.stats.accepted,
            rejected: r.stats.rejected,
            meanRemotenessSelected: round(r.stats.meanRemotenessSelected),
            meanPairwiseDistanceSelected: round(r.stats.meanPairwiseDistanceSelected),
            stopReason: r.stats.stopReason,
        },
        usage: r.usage,
        embedder: r.embedder,
    };
}
/** Human-readable rendering for the terminal. */
export function renderMarkdown(r) {
    const out = [];
    out.push(`# Divergent run ${r.runId}`, "", `**Problem:** ${r.problem}`, "");
    out.push(`## What everyone else will say`, ...r.consensus.obvious.map((o) => `- ${o}`), "");
    if (r.consensus.orthodoxies.length)
        out.push(`**Shared assumptions:** ${r.consensus.orthodoxies.join("; ")}`, "");
    out.push(`## Sparks`);
    for (const s of r.sparks) {
        out.push("", `### ${s.rank}. ${s.title}`, s.mechanism, "", `- Why non-obvious: ${s.whyNonObvious}`, `- First step: ${s.firstStep}`, `- Lens: ${s.lens}${s.stimulus ? ` (${s.stimulus})` : ""}, ${s.kind}`, `- Score ${s.score} | remoteness ${s.metrics.remoteness}${s.judge ? ` | originality ${round(s.judge.originality)} usefulness ${round(s.judge.usefulness)} specificity ${round(s.judge.specificity)}` : ""}`);
        if (s.conventionalTwin)
            out.push(`- Conventional twin: ${s.conventionalTwin}`);
        if (s.survivedAttack)
            out.push(`- Survived attack: ${s.survivedAttack}`);
    }
    out.push("", `---`, `${r.stats.generated} generated, ${r.stats.accepted} passed the gate, ${r.sparks.length} selected. ` +
        `Rejections: ${Object.entries(r.stats.rejected).map(([k, v]) => `${k.replace("rejected_", "")} ${v}`).join(", ") || "none"}. ` +
        `${r.usage.calls} model calls, about $${r.usage.estimatedCostUsd.toFixed(2)}, ${(r.durationMs / 1000).toFixed(1)}s. Embedder ${r.embedder}.`);
    return out.join("\n");
}
function round(x) {
    return Math.round(x * 100) / 100;
}
//# sourceMappingURL=views.js.map