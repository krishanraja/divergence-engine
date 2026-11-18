import { z } from "zod";
/*
 * Schemas avoid numeric and length constraints: structured outputs enforce shape,
 * and the engine clamps values itself. Ranges are stated in the prompts instead.
 */
export const IdeaSchema = z.object({
    title: z.string().describe("A short, specific name for the idea. No buzzwords."),
    mechanism: z
        .string()
        .describe("Two to four sentences on how it actually works: the moving parts, who does what, why it produces the result."),
    whyNonObvious: z.string().describe("One sentence: why a smart generalist would not have produced this."),
    firstStep: z.string().describe("One concrete action that would test or start it within a week."),
});
export const ConsensusSchema = z.object({
    obvious: z.array(z.string()).describe("The answers most people and most AI systems would give first."),
    orthodoxies: z.array(z.string()).describe("Assumptions that all of those answers silently share."),
});
export const IdeasSchema = z.object({ ideas: z.array(IdeaSchema) });
export const AttackSchema = z.object({
    conventionalTwin: z
        .string()
        .describe("The existing product, practice, paper or trope this idea is closest to. Say 'none found' only if genuinely none."),
    fatalFlaw: z.string().describe("The strongest reason this idea would fail in reality."),
    counterIdea: IdeaSchema.describe("A radically different idea that a rival with the opposite instinct would propose instead."),
});
export const MutationSchema = z.object({
    idea: IdeaSchema,
    rationale: z.string().describe("Which strange core was kept, and how the fatal flaw was answered."),
});
export const JudgeSchema = z.object({
    scores: z.array(z.object({
        id: z.string(),
        originality: z.number().describe("1 to 5"),
        usefulness: z.number().describe("1 to 5"),
        specificity: z.number().describe("1 to 5"),
        rationale: z.string().describe("One sentence."),
    })),
});
export const BlendSchema = z.object({
    idea: IdeaSchema,
    rationale: z.string().describe("What each parent contributes and why the combination is more than either."),
});
const GENERATOR_SYSTEM = `You are a divergent thinking engine. Your job is to produce ideas that a capable person would not reach on their own, and that still survive contact with reality.

Rules you never break:
- Never restate an obvious answer in new words. Rewording is not divergence.
- Every idea needs a concrete mechanism: who does what, with what, and why it produces the result.
- Prefer a strange idea that could work over a safe idea that already exists.
- No buzzwords, no hype, no vague verbs like "leverage", "empower", "revolutionize", "harness".
- Plain declarative sentences. No em dashes.`;
export function probePrompt(problem, context, n) {
    return {
        system: `You map consensus. You are not trying to be creative. You are trying to predict, as accurately as possible, what most competent people and most AI assistants would say first. Be honest and representative, not clever.`,
        user: `Problem:
${problem}
${context ? `\nContext:\n${context}\n` : ""}
1. List the ${n} answers that most people and most AI assistants would give first. Each one a single sentence with its core mechanism. Cover the full spread of the mainstream, not ${n} versions of one answer.
2. List 4 to 6 assumptions that all of those answers silently share (the orthodoxies of this problem).`,
    };
}
export function divergePrompt(args) {
    return {
        system: GENERATOR_SYSTEM,
        user: `Problem:
${args.problem}
${args.context ? `\nContext:\n${args.context}\n` : ""}
Your operator for this round:
${args.instruction}

Forbidden territory. These answers are already known. Do not produce them, variations of them, or ideas that share their core mechanism:
${args.avoid.map((a) => `- ${a}`).join("\n")}
${args.bannedWords.length ? `\nNever use these words: ${args.bannedWords.join(", ")}.\n` : ""}
Produce ${args.count} ideas. Make them different from each other in mechanism, not just in framing.`,
    };
}
export function attackPrompt(problem, idea, obvious) {
    return {
        system: `You are an adversarial reviewer in a structured debate. You did not write this idea and you are rewarded for finding its weaknesses. Be specific and fair: attack the strongest version of the idea, not a strawman.`,
        user: `Problem:
${problem}

Idea under attack:
Title: ${idea.title}
Mechanism: ${idea.mechanism}

The conventional answers to this problem are:
${obvious.map((o) => `- ${o}`).join("\n")}

1. conventionalTwin: what existing product, practice, research, or familiar trope is this idea secretly closest to? Expose it if it is a conventional idea in disguise.
2. fatalFlaw: the single strongest reason it would fail.
3. counterIdea: what would a rival with the opposite instinct propose instead?`,
    };
}
export function mutatePrompt(problem, idea, twin, flaw, avoid) {
    return {
        system: GENERATOR_SYSTEM,
        user: `Problem:
${problem}

Thesis:
Title: ${idea.title}
Mechanism: ${idea.mechanism}

Antithesis from the adversary:
- It is closest to: ${twin}
- Fatal flaw: ${flaw}

Synthesize a stronger idea. Requirements:
- Keep the strangest, most non-obvious element of the thesis. That element is the reason it exists.
- Answer the fatal flaw with a mechanism, not a caveat.
- Move further away from "${twin}" and from these conventional answers, never closer:
${avoid.map((a) => `  - ${a}`).join("\n")}
- Make one binding decision about the mechanism. Do not hedge between the thesis and the objection, and do not list options.
- State the precise condition under which the objection would still win, so the reader knows where the idea breaks.
A synthesis that splits the difference with the conventional answer is a failure. If the only way to fix the flaw is to become conventional, keep the thesis mechanism and patch the flaw narrowly.`,
    };
}
export function judgePrompt(problem, obvious, items) {
    return {
        system: `You are a calibrated creativity judge using the scoring method of the Alternate Uses Task literature, extended to usefulness and specificity. You score each idea independently and blind to who produced it. You are stingy with 5s.`,
        user: `Problem:
${problem}

Calibration anchors. These are the conventional answers. Each of them would score originality 1:
${obvious.map((o) => `- ${o}`).join("\n")}

Rubric (integers 1 to 5):
originality: 1 = the first thing most people would say. 2 = a known variant. 3 = a clever recombination of known patterns. 4 = surprising to an expert in the field. 5 = surprising and, once heard, obviously right; nobody is doing it.
usefulness: 1 = would not work or would not matter. 3 = plausible with real effort and moderate value. 5 = clearly workable and valuable.
specificity: 1 = vague gesture. 3 = a mechanism with gaps. 5 = concrete enough to start building tomorrow.

Bizarre is not original. An idea that is strange but pointless scores low on usefulness, and that is the right outcome.

Ideas:
${items.map((it) => `[${it.id}] ${it.idea.title}: ${it.idea.mechanism}`).join("\n")}

Return one score object per id.`,
    };
}
export function blendPrompt(problem, a, b, avoid) {
    return {
        system: GENERATOR_SYSTEM,
        user: `Problem:
${problem}

Two ideas from distant branches of exploration:
A. ${a.title}: ${a.mechanism}
B. ${b.title}: ${b.mechanism}

Build one hybrid that uses the core mechanism of A and the core mechanism of B together, so that each makes the other work better. It must not be a list of both. It must stay away from:
${avoid.map((x) => `- ${x}`).join("\n")}`,
    };
}
export function provokePrompt(problem, context, lensBlock, avoid, count) {
    return {
        system: GENERATOR_SYSTEM,
        user: `Problem:
${problem}
${context ? `\nContext:\n${context}\n` : ""}
Generate ${count} ideas. Use each of these operators at least once, and use them hard:
${lensBlock}

${avoid.length ? `Do not produce anything close to:\n${avoid.map((a) => `- ${a}`).join("\n")}\n` : ""}
Each idea must differ from the others in mechanism.`,
    };
}
const TARGET_VERBS = {
    generic: "Develop",
    code: "Design and implement",
    writing: "Write a piece built around",
    research: "Design a study or investigation that tests",
    strategy: "Build a strategy and operating plan around",
    design: "Design the experience and interface for",
    video: "Develop a video concept, hook and shot outline around",
    product: "Spec the smallest shippable product version of",
};
/** Deterministic downstream prompt. No model call, so it costs nothing and never drifts. */
export function downstreamPrompt(target, problem, idea, twin, flaw) {
    const lines = [
        `${TARGET_VERBS[target]} this concept.`,
        ``,
        `Problem: ${problem}`,
        `Concept: ${idea.title}`,
        `Mechanism: ${idea.mechanism}`,
        `Why it is non-obvious: ${idea.whyNonObvious}`,
        `First step: ${idea.firstStep}`,
    ];
    if (twin && !/^none/i.test(twin))
        lines.push(`Do not drift into: ${twin}. That is the conventional version this concept beats.`);
    if (flaw)
        lines.push(`Known risk to design against: ${flaw}`);
    lines.push(`Keep the non-obvious core intact. If you have to simplify, simplify everything else first.`);
    return lines.join("\n");
}
//# sourceMappingURL=prompts.js.map