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

export class BudgetExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`Model call budget of ${limit} exhausted`);
    this.name = "BudgetExceededError";
  }
}

export class RefusalError extends Error {
  constructor(public readonly role: Role, public readonly category: string | null) {
    super(`Model declined the ${role} call${category ? ` (${category})` : ""}`);
    this.name = "RefusalError";
  }
}

/**
 * Wraps a provider with a hard call ceiling and usage accounting.
 * The ceiling is checked before each call, so a run can never exceed it.
 */
export class MeteredProvider implements LLMProvider {
  calls = 0;
  inputTokens = 0;
  outputTokens = 0;
  costUsd = 0;

  constructor(private readonly inner: LLMProvider, private readonly maxCalls: number) {}

  get name(): string {
    return this.inner.name;
  }

  get remaining(): number {
    return Math.max(0, this.maxCalls - this.calls);
  }

  async structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>> {
    if (this.calls >= this.maxCalls) throw new BudgetExceededError(this.maxCalls);
    this.calls++;
    const res = await this.inner.structured(req);
    this.inputTokens += res.usage.inputTokens;
    this.outputTokens += res.usage.outputTokens;
    this.costUsd += this.inner.cost(res.usage);
    return res;
  }

  cost(usage: CallUsage): number {
    return this.inner.cost(usage);
  }
}
