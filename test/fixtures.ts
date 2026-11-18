import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ScriptedProvider } from "../src/llm/scripted.js";

export const OBVIOUS = [
  "Offer loyalty cards and discounts to regular bakery customers",
  "Run social media marketing with photos of fresh bread",
  "Launch online ordering and home delivery for bakery products",
  "Partner with local cafes to stock bakery pastries",
  "Host bread baking classes for the community",
  "Create seasonal limited edition bakery products",
  "Improve the store design and customer experience",
  "Sell gluten free and vegan bakery options",
];

const POOL =
  "lighthouse glacier falcon quarry harbor violin orchard comet lantern meadow tundra compass anvil saffron prism canyon ember walrus tapestry basalt monsoon cobalt marrow sextant pylon thicket cipher nebula gondola lagoon mosaic quiver ravine sorrel turbine umber vortex wicker yarrow zephyr bramble cinder dagger fjord garnet hemlock indigo jasper kelp loom".split(
    " ",
  );

let wordCursor = 0;
function words(n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(POOL[wordCursor++ % POOL.length]! + (wordCursor >= POOL.length ? String(Math.floor(wordCursor / POOL.length)) : ""));
  return out;
}

/** An idea with vocabulary no other idea shares. */
export function freshIdea(label = "idea") {
  const w = words(6);
  return {
    title: `${label} ${w[0]} ${w[1]}`,
    mechanism: `The ${w[2]} ${w[3]} system pairs ${w[4]} with ${w[5]} so each visit compounds.`,
    whyNonObvious: `Nobody links ${w[2]} to ${w[4]}.`,
    firstStep: `Prototype the ${w[3]} step this week.`,
  };
}

/** An idea that is just a consensus answer reworded. */
export function copyIdea(i: number) {
  const o = OBVIOUS[i % OBVIOUS.length]!;
  return { title: o, mechanism: o, whyNonObvious: "It is new.", firstStep: "Start." };
}

export interface ScriptOptions {
  /** Every Nth diverge idea is a reworded consensus answer. */
  copyEvery?: number;
  /** Make every mutation regress to a consensus answer. */
  regress?: boolean;
  usefulness?: number;
}

export function scriptedProvider(o: ScriptOptions = {}) {
  let n = 0;
  return new ScriptedProvider({
    probe: () => ({ obvious: OBVIOUS, orthodoxies: ["customers must visit the shop", "bread is sold by the loaf"] }),
    diverge: (req) => {
      const count = Number(/Produce (\d+) ideas/.exec(req.user)?.[1] ?? 4);
      const ideas = Array.from({ length: count }, () => {
        n++;
        return o.copyEvery && n % o.copyEvery === 0 ? copyIdea(n) : freshIdea("seed");
      });
      return { ideas };
    },
    provoke: (req) => {
      const count = Number(/Generate (\d+) ideas/.exec(req.user)?.[1] ?? 6);
      return { ideas: Array.from({ length: count }, (_, i) => (i % 4 === 3 ? copyIdea(i) : freshIdea("provoke"))) };
    },
    adversary: () => ({ conventionalTwin: "a subscription box", fatalFlaw: "customers will not change habits", counterIdea: freshIdea("counter") }),
    synthesize: () => ({ idea: o.regress ? copyIdea(0) : freshIdea("mutation"), rationale: "kept the strange core" }),
    judge: (req) => {
      const ids = [...req.user.matchAll(/^\[([^\]]+)\]/gm)].map((m) => m[1]!);
      return { scores: ids.map((id) => ({ id, originality: 4, usefulness: o.usefulness ?? 4, specificity: 4, rationale: "ok" })) };
    },
    blend: () => ({ idea: freshIdea("hybrid"), rationale: "both parents" }),
  });
}

export async function tempHome(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "divergent-test-"));
}
