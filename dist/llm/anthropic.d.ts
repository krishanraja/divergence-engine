import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { type CallUsage, type Effort, type LLMProvider, type Role, type StructuredRequest, type StructuredResponse } from "./provider.js";
export interface AnthropicProviderOptions {
    /** Model for every role unless overridden. Default claude-opus-5-5. */
    model?: string;
    /**
     * Per-role model overrides, e.g. a cheaper judge. An array is a roster: calls for that
     * role rotate through it. dialectica's ablations found roster heterogeneity, not
     * scoring or adversarial steps, was the lever behind its open-ended quality gains.
     */
    roleModels?: Partial<Record<Role, string | string[]>>;
    /** Per-role effort overrides. */
    roleEffort?: Partial<Record<Role, Effort>>;
    /** Opt out of server-side refusal fallbacks. */
    disableFallbacks?: boolean;
    client?: Anthropic;
}
/**
 * Builds the role-to-model roster from options plus environment.
 * DIVERGENT_MODEL sets every role; DIVERGENT_MODEL_<ROLE> (e.g. DIVERGENT_MODEL_JUDGE) overrides one.
 * A comma-separated value is a roster, e.g. DIVERGENT_MODEL_DIVERGE=claude-opus-5-5,claude-sonnet-5-5.
 */
export declare function resolveRoleModels(opts?: AnthropicProviderOptions): Record<Role, string[]>;
export declare class AnthropicProvider implements LLMProvider {
    readonly name = "anthropic";
    private clientInstance;
    private readonly models;
    private readonly cursor;
    private readonly effort;
    private readonly fallbacks;
    constructor(opts?: AnthropicProviderOptions);
    private get client();
    structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>>;
    cost(usage: CallUsage): number;
}
