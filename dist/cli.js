#!/usr/bin/env node
/**
 *   divergent "How might a small bakery win against supermarkets?"
 *   divergent --mode provoke --target video "Hooks for a video about AI anxiety"
 *   divergent --mode score --ideas ideas.json "problem"
 *   divergent --mode challenge --idea "Launch a newsletter" "Grow an audience for a consultancy"
 *
 * Flags: --mode run|provoke|map|score|challenge  --target  --temperament  --count
 *        --namespace  --context  --cliche (repeatable)  --lens (repeatable)
 *        --max-calls  --seed  --json  --no-remember  --ideas <file.json>  --idea <text>
 */
import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createEngine } from "./index.js";
import { compactReport, renderMarkdown } from "./views.js";
const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        mode: { type: "string", default: "run" },
        target: { type: "string" },
        temperament: { type: "string" },
        count: { type: "string" },
        namespace: { type: "string" },
        context: { type: "string" },
        cliche: { type: "string", multiple: true },
        lens: { type: "string", multiple: true },
        "max-calls": { type: "string" },
        seed: { type: "string" },
        json: { type: "boolean", default: false },
        out: { type: "string" },
        "no-remember": { type: "boolean", default: false },
        ideas: { type: "string" },
        idea: { type: "string" },
        quiet: { type: "boolean", default: false },
    },
});
const problem = positionals.join(" ").trim();
if (!problem) {
    console.error('usage: divergence-engine (or divergent) [--mode run|provoke|map|score|challenge] "problem statement"');
    process.exit(2);
}
const num = (s) => (s === undefined ? undefined : Number(s));
const log = (m) => {
    if (!values.quiet)
        console.error(m);
};
const engine = await createEngine({ onWarning: (m) => log(`warning: ${m}`) });
const common = {
    problem,
    context: values.context,
    cliches: values.cliche,
    namespace: values.namespace,
    target: values.target,
    count: num(values.count),
    seed: num(values.seed),
    remember: !values["no-remember"],
};
let output;
switch (values.mode) {
    case "run": {
        const opts = {
            ...common,
            temperament: values.temperament,
            lenses: values.lens,
            maxCalls: num(values["max-calls"]),
            onEvent: (e) => {
                if (e.type === "stage")
                    log(`> ${e.stage}${e.detail ? `: ${e.detail}` : ""}`);
                if (e.type === "wave")
                    log(`  wave ${e.wave}: ${e.accepted}/${e.generated} passed the gate`);
                if (e.type === "warning")
                    log(`  warning: ${e.message}`);
            },
        };
        const report = await engine.run(opts);
        output = values.json ? report : renderMarkdown(report);
        if (!values.json) {
            process.stdout.write(output + "\n");
            if (values.out)
                await writeFile(values.out, JSON.stringify(report, null, 2));
            process.exit(0);
        }
        break;
    }
    case "provoke": {
        const report = await engine.provoke(common);
        output = values.json ? compactReport(report) : renderMarkdown(report);
        if (!values.json) {
            process.stdout.write(output + "\n");
            process.exit(0);
        }
        break;
    }
    case "map":
        output = await engine.mapConsensus(problem, values.context);
        break;
    case "score": {
        if (!values.ideas)
            throw new Error("--ideas <file.json> (an array of strings) is required");
        const ideas = JSON.parse(await readFile(values.ideas, "utf8"));
        output = await engine.score({ problem, ideas, namespace: values.namespace, judge: true });
        break;
    }
    case "challenge":
        if (!values.idea)
            throw new Error("--idea <text> is required");
        output = await engine.challenge({ problem, idea: values.idea, context: values.context, target: common.target });
        break;
    default:
        throw new Error(`unknown mode ${values.mode}`);
}
const text = JSON.stringify(output, null, 2);
if (values.out)
    await writeFile(values.out, text);
process.stdout.write(text + "\n");
//# sourceMappingURL=cli.js.map