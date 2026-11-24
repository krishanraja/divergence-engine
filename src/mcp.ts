#!/usr/bin/env node
/**
 * MCP server (stdio). Lets Claude Code, Claude Desktop and any MCP host consult the engine.
 *
 *   claude mcp add divergent -- node /path/to/divergence-engine/dist/mcp.js
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createEngine } from "./index.js";
import { LENSES } from "./lenses.js";
import type { DivergentEngine } from "./engine.js";
import { compactReport } from "./views.js";

const targets = ["generic", "code", "writing", "research", "strategy", "design", "video", "product"] as const;

let enginePromise: Promise<DivergentEngine> | null = null;
const engine = () => (enginePromise ??= createEngine({ onWarning: (m) => console.error(`[divergent] ${m}`) }));

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (err: unknown) => ({ isError: true, content: [{ type: "text" as const, text: (err as Error).message }] });

const server = new McpServer({ name: "divergence-engine", version: "0.1.0" });

server.registerTool(
  "diverge",
  {
    title: "Divergent brainstorm",
    description:
      "Full divergent thinking run. Maps what everyone else would say, generates ideas through cognitive lenses that are forbidden from repeating it, attacks the best survivors adversarially, judges blind, and returns a diverse portfolio of scored sparks, each with a ready-to-run prompt. About 25 to 40 model calls. Use before committing to an approach when the default answer is not good enough.",
    inputSchema: {
      problem: z.string().describe("The problem or brief. Be specific about the outcome wanted."),
      context: z.string().optional().describe("Constraints, audience, what already exists."),
      cliches: z.array(z.string()).optional().describe("Answers you already consider obvious. They are added to the forbidden territory."),
      bannedWords: z.array(z.string()).optional(),
      namespace: z.string().optional().describe("Memory partition, one per consuming engine, so it is never handed the same idea twice."),
      target: z.enum(targets).optional().describe("Shapes the downstream prompt for each spark."),
      temperament: z.enum(["grounded", "balanced", "wild"]).optional(),
      count: z.number().int().optional().describe("Sparks to return. Default 5."),
      lenses: z.array(z.string()).optional().describe(`Force lenses: ${LENSES.map((l) => l.name).join(", ")}`),
      maxCalls: z.number().int().optional().describe("Hard ceiling on model calls. Default 40."),
      seed: z.number().int().optional(),
    },
  },
  async (args) => {
    try {
      const report = await (await engine()).run(args);
      return json(compactReport(report));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "provoke",
  {
    title: "Quick provocation",
    description: "Cheap divergence: two model calls. Maps the consensus, generates through four random lenses, and returns the most remote, mutually different ideas. Use for frequent, low-stakes inspiration.",
    inputSchema: {
      problem: z.string(),
      context: z.string().optional(),
      cliches: z.array(z.string()).optional(),
      namespace: z.string().optional(),
      target: z.enum(targets).optional(),
      count: z.number().int().optional(),
    },
  },
  async (args) => {
    try {
      return json(compactReport(await (await engine()).provoke(args)));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "map_consensus",
  {
    title: "Map the consensus",
    description: "One call. Returns what most people and most AI systems would say first, and the assumptions they share. Use to see the default before deciding whether to diverge.",
    inputSchema: { problem: z.string(), context: z.string().optional() },
  },
  async ({ problem, context }) => {
    try {
      return json(await (await engine()).mapConsensus(problem, context));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "score_divergence",
  {
    title: "Score divergence",
    description:
      "Measure how far a set of ideas or outputs sits from the consensus, from each other, and from what this namespace has seen before. Pass `obvious` to run with zero model calls. Use to check whether another engine is producing the default in disguise.",
    inputSchema: {
      problem: z.string(),
      ideas: z.array(z.string()),
      obvious: z.array(z.string()).optional().describe("Known conventional answers. Omit to have the engine map them (one call)."),
      namespace: z.string().optional(),
      judge: z.boolean().optional().describe("Also run the blind originality judge (one more call)."),
      bannedWords: z.array(z.string()).optional().describe("A kill list. Ideas containing these get status rejected_anchor_word."),
    },
  },
  async (args) => {
    try {
      return json(await (await engine()).score(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "challenge",
  {
    title: "Challenge an idea",
    description: "Three calls. Finds the conventional twin of an existing idea or plan, its fatal flaw, a rival counter-idea, and a mutation that keeps its strange core while moving further from the consensus.",
    inputSchema: { problem: z.string(), idea: z.string(), context: z.string().optional(), target: z.enum(targets).optional(), namespace: z.string().optional() },
  },
  async (args) => {
    try {
      return json(await (await engine()).challenge(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "record_outputs",
  {
    title: "Record shipped outputs",
    description:
      "Zero model calls. Add what a consuming engine actually shipped (posts, hooks, plays) to its namespace memory, so later runs and scores treat them as already used. Send de-identified text only.",
    inputSchema: { namespace: z.string(), items: z.array(z.string()), label: z.string().optional() },
  },
  async (args) => {
    try {
      return json(await (await engine()).record(args));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  "list_lenses",
  { title: "List lenses", description: "The cognitive lenses the engine can apply.", inputSchema: {} },
  async () => json(LENSES.map((l) => ({ name: l.name, summary: l.summary }))),
);

await server.connect(new StdioServerTransport());
