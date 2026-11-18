/**
 * Gate calibration check with the real local embedder. No model calls, no spend.
 *
 * For each problem: a consensus set (what a model says first), rewordings of those
 * answers (must be rejected), and genuinely non-obvious, on-topic ideas (must pass).
 * The non-obvious ideas deliberately reuse the topic vocabulary, because that is the
 * hard case: a semantic embedder clusters by topic, and the gate must not punish an
 * idea for being about the same problem.
 *
 *   npm run calibrate
 */
import { createEmbedder } from "../src/embed/embedder.js";
import { calibrate, gate } from "../src/stages/gate.js";
import type { Temperament } from "../src/types.js";

interface Case {
  problem: string;
  obvious: string[];
  reworded: string[];
  novel: string[];
}

const CASES: Case[] = [
  {
    problem: "How can an independent bakery compete with supermarkets?",
    obvious: [
      "Offer a loyalty card that rewards repeat customers with free items",
      "Market on Instagram with photos of fresh bread and pastries",
      "Add online ordering and local delivery",
      "Sell wholesale to nearby cafes and restaurants",
      "Run bread baking classes and workshops",
      "Introduce seasonal and limited edition products",
      "Emphasise artisanal quality, local ingredients and freshness",
      "Offer gluten free, vegan and specialty dietary options",
      "Create a cosy cafe space so people stay longer",
      "Partner with farmers markets and community events",
    ],
    reworded: [
      "Give regular customers a rewards card so they earn free pastries",
      "Use Instagram and TikTok to show off fresh baked goods",
      "Let people order online and deliver bread to their homes",
      "Supply local coffee shops and restaurants wholesale",
      "Host workshops teaching people how to bake bread",
    ],
    novel: [
      "Rent the ovens overnight to ceramic artists who fire pottery between bread batches, turning idle heat into a second revenue line",
      "Sell a bread futures contract: customers prepay for a year of loaves at a locked price, funding a new oven and guaranteeing demand",
      "Run the bakery as a sourdough library where people borrow and return starter cultures, so every borrower becomes a weekly visitor",
      "Bake to order from a neighbourhood group chat at 4am and destroy nothing, publishing the zero waste ledger as the brand",
      "Place a single loaf vending locker inside the night shift entrance of the local hospital, served by the bakery at 6am",
    ],
  },
  {
    problem: "How should a B2B software company reduce customer churn?",
    obvious: [
      "Improve onboarding so customers reach value faster",
      "Assign customer success managers to key accounts",
      "Track health scores and intervene with at-risk accounts",
      "Offer discounts or annual contracts to lock customers in",
      "Survey customers with NPS and act on feedback",
      "Ship features customers request most often",
      "Build in-product education and help documentation",
      "Run quarterly business reviews with customers",
      "Improve customer support response times",
      "Create a customer community and user group",
    ],
    reworded: [
      "Make onboarding smoother so users see value sooner",
      "Give every important account a dedicated customer success manager",
      "Score account health and reach out when a customer looks at risk",
      "Use annual contracts and discounts to keep customers from leaving",
      "Ask customers for NPS feedback and respond to it",
    ],
    novel: [
      "Pay customers a cancellation bounty for a recorded exit interview, then sell the anonymised churn reasons back to the product team as the roadmap",
      "Make the product deliberately worse for one week each year so customers notice what they would lose, with opt out for anyone who asks",
      "Let customers sublet unused seats to other companies in their industry, so idle licences become income instead of a reason to cancel",
      "Tie the champion's personal certification to the account, so the person who bought the software loses a career credential if the company churns",
      "Publish every customer's achieved outcomes on a public ledger that their own board can see, making cancellation an admission of failure",
    ],
  },
  {
    problem: "Hooks for a short video about AI anxiety among senior leaders",
    obvious: [
      "Start with a shocking statistic about jobs replaced by AI",
      "Ask the viewer if they are worried AI will take their job",
      "Show a robot replacing a person in an office",
      "Open with a famous quote about technology and change",
      "Tell a story about a CEO who ignored AI and failed",
      "List three signs you are falling behind on AI",
      "Show a fast montage of AI headlines",
      "Start with a confession that the creator was scared of AI too",
      "Compare AI to the arrival of the internet",
      "Promise a simple framework to stop worrying about AI",
    ],
    reworded: [
      "Lead with a startling number about how many jobs AI will eliminate",
      "Ask viewers whether they fear losing their job to AI",
      "A humanoid robot takes over an employee's desk",
      "Begin with a well known quote about change and technology",
      "Share the story of a chief executive who dismissed AI and lost",
    ],
    novel: [
      "Film a board meeting where every executive is nodding at an AI slide, then cut to their search history at midnight asking what an LLM is",
      "Open on a senior leader's calendar: forty meetings about AI strategy, zero hours actually using it",
      "Show an executive confidently answering a question from their eight year old about AI, then the child correcting them",
      "Start with the sound of a career ending: silence in a meeting after someone asks the leader a direct AI question",
      "A leader practises sounding confident about AI in the bathroom mirror before walking into the boardroom",
    ],
  },
];

const emb = await createEmbedder(process.env.DIVERGENT_EMBEDDER, (m) => console.error(`warning: ${m}`));
console.log(`embedder: ${emb.id}\n`);

for (const temperament of ["grounded", "balanced", "wild"] as Temperament[]) {
  let rewordRejected = 0;
  let novelAccepted = 0;
  let total = 0;
  let novelPairsFlaggedDuplicate = 0;
  let novelPairs = 0;
  const detail: string[] = [];
  for (const c of CASES) {
    const wells = await emb.embed(c.obvious);
    const cal = calibrate(wells, temperament);
    const rw = await emb.embed(c.reworded);
    const nv = await emb.embed(c.novel);
    const status = (v: number[]) => gate({ vector: v, text: "", wells, archive: [], peers: [], bannedWords: [], calibration: cal });
    const rwRes = rw.map(status);
    const nvRes = nv.map(status);
    rewordRejected += rwRes.filter((r) => r.status === "rejected_gravity").length;
    novelAccepted += nvRes.filter((r) => r.status === "accepted").length;
    total += c.reworded.length;
    for (let i = 0; i < nv.length; i++)
      for (let j = i + 1; j < nv.length; j++) {
        novelPairs++;
        if (gate({ vector: nv[i]!, text: "", wells: [], archive: [], peers: [nv[j]!], bannedWords: [], calibration: cal }).status === "rejected_duplicate") novelPairsFlaggedDuplicate++;
      }
    detail.push(
      `  ${c.problem.slice(0, 50).padEnd(50)} spread ${cal.spread.toFixed(3)}  reworded remoteness ${rwRes.map((r) => r.metrics.remoteness.toFixed(2)).join(" ")}  novel ${nvRes.map((r) => r.metrics.remoteness.toFixed(2)).join(" ")}`,
    );
  }
  console.log(`${temperament}: rewordings rejected ${rewordRejected}/${total}, novel accepted ${novelAccepted}/${total}, distinct novel pairs wrongly flagged duplicate ${novelPairsFlaggedDuplicate}/${novelPairs}`);
  console.log(detail.join("\n"));
}
