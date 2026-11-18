import type { z } from "zod";
import type { CallUsage, LLMProvider, Role, StructuredRequest, StructuredResponse } from "./provider.js";
export type ScriptHandler = (req: StructuredRequest<z.ZodType>, callIndex: number) => unknown;
/**
 * Deterministic provider driven by per-role handlers. Used by the test suite and
 * for dry runs that exercise the full pipeline without spending tokens.
 * Every reply is validated against the request schema, exactly as the real API enforces.
 */
export declare class ScriptedProvider implements LLMProvider {
    private readonly handlers;
    readonly name = "scripted";
    readonly log: Array<{
        role: Role;
        user: string;
    }>;
    private n;
    constructor(handlers: Partial<Record<Role, ScriptHandler>>);
    structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>>;
    cost(_usage: CallUsage): number;
}
