import { z } from "zod";
import type { ConsensusMap, IdeaDraft, Target } from "./types.js";
export declare const IdeaSchema: z.ZodObject<{
    title: z.ZodString;
    mechanism: z.ZodString;
    whyNonObvious: z.ZodString;
    firstStep: z.ZodString;
}, z.core.$strip>;
export declare const ConsensusSchema: z.ZodObject<{
    obvious: z.ZodArray<z.ZodString>;
    orthodoxies: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export declare const IdeasSchema: z.ZodObject<{
    ideas: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        mechanism: z.ZodString;
        whyNonObvious: z.ZodString;
        firstStep: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const AttackSchema: z.ZodObject<{
    conventionalTwin: z.ZodString;
    fatalFlaw: z.ZodString;
    counterIdea: z.ZodObject<{
        title: z.ZodString;
        mechanism: z.ZodString;
        whyNonObvious: z.ZodString;
        firstStep: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const MutationSchema: z.ZodObject<{
    idea: z.ZodObject<{
        title: z.ZodString;
        mechanism: z.ZodString;
        whyNonObvious: z.ZodString;
        firstStep: z.ZodString;
    }, z.core.$strip>;
    rationale: z.ZodString;
}, z.core.$strip>;
export declare const JudgeSchema: z.ZodObject<{
    scores: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        originality: z.ZodNumber;
        usefulness: z.ZodNumber;
        specificity: z.ZodNumber;
        rationale: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const BlendSchema: z.ZodObject<{
    idea: z.ZodObject<{
        title: z.ZodString;
        mechanism: z.ZodString;
        whyNonObvious: z.ZodString;
        firstStep: z.ZodString;
    }, z.core.$strip>;
    rationale: z.ZodString;
}, z.core.$strip>;
export declare function probePrompt(problem: string, context: string | undefined, n: number): {
    system: string;
    user: string;
};
export declare function divergePrompt(args: {
    problem: string;
    context?: string;
    instruction: string;
    avoid: string[];
    bannedWords: string[];
    count: number;
}): {
    system: string;
    user: string;
};
export declare function attackPrompt(problem: string, idea: IdeaDraft, obvious: string[]): {
    system: string;
    user: string;
};
export declare function mutatePrompt(problem: string, idea: IdeaDraft, twin: string, flaw: string, avoid: string[]): {
    system: string;
    user: string;
};
export declare function judgePrompt(problem: string, obvious: string[], items: Array<{
    id: string;
    idea: IdeaDraft;
}>): {
    system: string;
    user: string;
};
export declare function blendPrompt(problem: string, a: IdeaDraft, b: IdeaDraft, avoid: string[]): {
    system: string;
    user: string;
};
export declare function provokePrompt(problem: string, context: string | undefined, lensBlock: string, avoid: string[], count: number): {
    system: string;
    user: string;
};
/** Deterministic downstream prompt. No model call, so it costs nothing and never drifts. */
export declare function downstreamPrompt(target: Target, problem: string, idea: IdeaDraft, twin?: string, flaw?: string): string;
export type { ConsensusMap };
