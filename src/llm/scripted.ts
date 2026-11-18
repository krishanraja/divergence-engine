import type { z } from "zod";
import type { CallUsage, LLMProvider, Role, StructuredRequest, StructuredResponse } from "./provider.js";

export type ScriptHandler = (req: StructuredRequest<z.ZodType>, callIndex: number) => unknown;

/**
 * Deterministic provider driven by per-role handlers. Used by the test suite and
 * for dry runs that exercise the full pipeline without spending tokens.
 * Every reply is validated against the request schema, exactly as the real API enforces.
 */
export class ScriptedProvider implements LLMProvider {
  readonly name = "scripted";
  readonly log: Array<{ role: Role; user: string }> = [];
  private n = 0;

  constructor(private readonly handlers: Partial<Record<Role, ScriptHandler>>) {}

  async structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>> {
    const handler = this.handlers[req.role];
    if (!handler) throw new Error(`ScriptedProvider has no handler for role ${req.role}`);
    this.log.push({ role: req.role, user: req.user });
    const raw = handler(req as StructuredRequest<z.ZodType>, this.n++);
    const data = req.schema.parse(raw) as z.infer<S>;
    return { data, usage: { inputTokens: 0, outputTokens: 0, model: "scripted" } };
  }

  cost(_usage: CallUsage): number {
    return 0;
  }
}
