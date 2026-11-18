import type { z } from "zod";
/** The role a call plays. Lets providers route roles to different models and lets tests script replies. */
export type Role = "probe" | "diverge" | "adversary" | "synthesize" | "judge" | "blend" | "provoke";
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";
export interface StructuredRequest<S extends z.ZodType> {
    role: Role;
    system: string;
    user: string;
    schema: S;
    effort?: Effort;
    maxTokens?: number;
}
export interface CallUsage {
    inputTokens: number;
    outputTokens: number;
    model: string;
}
export interface StructuredResponse<T> {
    data: T;
    usage: CallUsage;
}
/**
 * Anything that can turn a prompt into schema-validated JSON.
 * The engine depends only on this interface, so a provider can be the Anthropic API,
 * a scripted fake for tests, or any future backend.
 */
export interface LLMProvider {
    readonly name: string;
    structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>>;
    /** Estimated USD cost for the given usage. Return 0 when unknown. */
    cost(usage: CallUsage): number;
}
export declare class BudgetExceededError extends Error {
    readonly limit: number;
    constructor(limit: number);
}
export declare class RefusalError extends Error {
    readonly role: Role;
    readonly category: string | null;
    constructor(role: Role, category: string | null);
}
/**
 * Wraps a provider with a hard call ceiling and usage accounting.
 * The ceiling is checked before each call, so a run can never exceed it.
 */
export declare class MeteredProvider implements LLMProvider {
    private readonly inner;
    private readonly maxCalls;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    constructor(inner: LLMProvider, maxCalls: number);
    get name(): string;
    get remaining(): number;
    structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>>;
    cost(usage: CallUsage): number;
}
