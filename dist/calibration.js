import { calibrate, gate } from "./stages/gate.js";
import { distance } from "./util.js";
export const CALIBRATION_CASES = [
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
/** Measure an embedder against the calibration set. Zero model calls; one embedding batch per case. */
export async function runCalibration(embedder, factors) {
    let maxRw = 0;
    let minNv = Infinity;
    const temps = ["grounded", "balanced", "wild"];
    const by = Object.fromEntries(temps.map((t) => [t, { rewordsRejected: 0, novelAccepted: 0, total: 0, falseDuplicates: 0, pairs: 0 }]));
    for (const c of CALIBRATION_CASES) {
        const wells = await embedder.embed(c.obvious);
        const rw = await embedder.embed(c.reworded);
        const nv = await embedder.embed(c.novel);
        const spread = calibrate(wells, "balanced", { balanced: 1 }).spread;
        const nearest = (v) => Math.min(...wells.map((w) => distance(v, w)));
        for (const v of rw)
            maxRw = Math.max(maxRw, nearest(v) / spread);
        for (const v of nv)
            minNv = Math.min(minNv, nearest(v) / spread);
        for (const t of temps) {
            const cal = calibrate(wells, t, factors, embedder.id);
            const status = (v, peers = []) => gate({ vector: v, text: "", wells, archive: [], peers, bannedWords: [], calibration: cal }).status;
            by[t].rewordsRejected += rw.filter((v) => status(v) === "rejected_gravity").length;
            by[t].novelAccepted += nv.filter((v) => status(v) === "accepted").length;
            by[t].total += c.reworded.length;
            for (let i = 0; i < nv.length; i++)
                for (let j = i + 1; j < nv.length; j++) {
                    by[t].pairs++;
                    if (gate({ vector: nv[i], text: "", wells: [], archive: [], peers: [nv[j]], bannedWords: [], calibration: cal }).status === "rejected_duplicate")
                        by[t].falseDuplicates++;
                }
        }
    }
    const separable = maxRw < minNv;
    return {
        embedder: embedder.id,
        maxRewordRemoteness: round(maxRw),
        minNovelRemoteness: round(minNv),
        separable,
        suggestedBalanced: separable ? round((maxRw + minNv) / 2) : null,
        byTemperament: by,
    };
}
function round(x) {
    return Math.round(x * 1000) / 1000;
}
//# sourceMappingURL=calibration.js.map