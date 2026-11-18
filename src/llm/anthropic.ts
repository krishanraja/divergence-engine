import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import {
  RefusalError,
  type CallUsage,
  type Effort,
  type LLMProvider,
  type Role,
  type StructuredRequest,
  type StructuredResponse,
} from "./provider.js";

/** USD per million tokens. Source: Anthropic pricing table, cached 2026-11-03. Unknown models cost 0. */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-2": { input: 8, output: 40 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

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
 * Default effort by role. Generation and attack are where depth pays; the probe and
 * judge are bounded tasks where medium holds quality at lower cost.
 */
const DEFAULT_EFFORT: Record<Role, Effort> = {
  probe: "medium",
  diverge: "high",
  adversary: "high",
  synthesize: "high",
  judge: "medium",
  blend: "high",
  provoke: "medium",
};

/**
 * Builds the role-to-model roster from options plus environment.
 * DIVERGENT_MODEL sets every role; DIVERGENT_MODEL_<ROLE> (e.g. DIVERGENT_MODEL_JUDGE) overrides one.
 * A comma-separated value is a roster, e.g. DIVERGENT_MODEL_DIVERGE=claude-opus-5-5,claude-sonnet-5-5.
 */
export function resolveRoleModels(opts: AnthropicProviderOptions = {}): Record<Role, string[]> {
  const base = opts.model ?? process.env.DIVERGENT_MODEL ?? "claude-opus-5-5";
  const roles: Role[] = ["probe", "diverge", "adversary", "synthesize", "judge", "blend", "provoke"];
  const out = {} as Record<Role, string[]>;
  const split = (v: string | string[]) =>
    (Array.isArray(v) ? v : v.split(",")).map((m) => m.trim()).filter(Boolean);
  for (const r of roles) {
    const v = opts.roleModels?.[r] ?? process.env[`DIVERGENT_MODEL_${r.toUpperCase()}`] ?? base;
    const roster = split(v);
    out[r] = roster.length ? roster : [base];
  }
  return out;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  private clientInstance: Anthropic | undefined;
  private readonly models: Record<Role, string[]>;
  private readonly cursor: Partial<Record<Role, number>> = {};
  private readonly effort: Record<Role, Effort>;
  private readonly fallbacks: boolean;

  constructor(opts: AnthropicProviderOptions = {}) {
    // Constructed lazily so zero-call operations (scoring against a known consensus,
    // listing lenses) work on machines with no Anthropic credentials.
    this.clientInstance = opts.client;
    this.models = resolveRoleModels(opts);
    this.effort = { ...DEFAULT_EFFORT, ...opts.roleEffort };
    this.fallbacks = !opts.disableFallbacks && process.env.DIVERGENT_DISABLE_FALLBACKS !== "1";
  }

  private get client(): Anthropic {
    return (this.clientInstance ??= new Anthropic());
  }

  async structured<S extends z.ZodType>(req: StructuredRequest<S>): Promise<StructuredResponse<z.infer<S>>> {
    const roster = this.models[req.role];
    const i = this.cursor[req.role] ?? 0;
    this.cursor[req.role] = i + 1;
    const model = roster[i % roster.length]!;
    const params = {
      model,
      max_tokens: req.maxTokens ?? 16000,
      system: [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }],
      messages: [{ role: "user" as const, content: req.user }],
      output_config: {
        effort: req.effort ?? this.effort[req.role],
        format: betaZodOutputFormat(req.schema),
      },
      ...(this.fallbacks
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
    };

    const res = await this.client.beta.messages.parse(params);

    if (res.stop_reason === "refusal") {
      throw new RefusalError(req.role, res.stop_details?.category ?? null);
    }
    if (res.parsed_output == null) {
      const reason = res.stop_reason === "max_tokens" ? "output hit max_tokens" : "output did not match schema";
      throw new Error(`${req.role} call returned no parsed output: ${reason}`);
    }

    return {
      data: res.parsed_output as z.infer<S>,
      usage: {
        inputTokens:
          res.usage.input_tokens +
          (res.usage.cache_creation_input_tokens ?? 0) +
          (res.usage.cache_read_input_tokens ?? 0),
        outputTokens: res.usage.output_tokens,
        model,
      },
    };
  }

  cost(usage: CallUsage): number {
    const p = PRICES[usage.model];
    if (!p) return 0;
    return (usage.inputTokens * p.input + usage.outputTokens * p.output) / 1_000_000;
  }
}
