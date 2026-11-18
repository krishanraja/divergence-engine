import { pick } from "./util.js";
export const REMOTE_DOMAINS = [
    "mycology and fungal networks",
    "beekeeping",
    "jazz improvisation",
    "the human immune system",
    "medieval craft guilds",
    "origami and fold mathematics",
    "air traffic control",
    "sourdough fermentation",
    "coral reef ecology",
    "chess opening theory",
    "cartography and map projection",
    "monastic orders",
    "professional poker",
    "ant colony foraging",
    "opera stagecraft",
    "glaciology",
    "perfumery",
    "falconry",
    "Formula 1 pit stops",
    "close-up card magic",
    "lichen symbiosis",
    "typography and type design",
    "railway signalling",
    "spider silk engineering",
    "19th century postal systems",
    "insurance underwriting at Lloyd's",
    "tidal and lunar cycles",
    "wine blending",
    "search and rescue triage",
    "sumo stables",
    "shipping container logistics",
    "bonsai cultivation",
    "improv theatre",
    "venom pharmacology",
    "seed banks and the Svalbard vault",
    "carnival and fairground economics",
    "orchestral conducting",
    "geology of river deltas",
    "hospital infection control",
    "the game of Go",
    "street food markets in Bangkok",
    "Antarctic research stations",
    "translation of poetry",
    "speedrunning video games",
    "court stenography",
    "dairy cooperatives",
    "tattoo artistry",
    "submarine operations",
    "museum conservation",
    "migratory bird navigation",
];
export const ABSURD_CONSTRAINTS = [
    "it must cost nothing to run",
    "it must work with no internet connection",
    "it must be finished in one hour",
    "it must work at one thousand times the current scale",
    "it must work for exactly one person",
    "it must have no screen and no text",
    "it must be explainable to a seven year old in one sentence",
    "it must make money from the people who currently get it free",
    "it must survive the disappearance of its main supplier",
    "every user must also be a contributor",
    "it must get better the more people try to break it",
    "it must take one hundred years to pay off",
];
export const EXTREME_USERS = [
    "a 90 year old who has never used a smartphone",
    "a ten year old",
    "a hostile competitor who wants it to fail",
    "an AI agent with no human in the loop",
    "someone in a crisis with ten seconds of attention",
    "the most expert person in the world at this",
    "someone who has to pay for it with their own money tonight",
    "a regulator",
    "a person with no shared language",
    "a power user who will automate everything",
];
export const RANDOM_OBJECTS = [
    "a lighthouse",
    "a vending machine",
    "a pressure cooker",
    "a library card",
    "a metronome",
    "a pawn shop",
    "a sundial",
    "a ransom note",
    "a hot air balloon",
    "a fishing net",
    "a time capsule",
    "a lottery",
    "a field hospital",
    "a jukebox",
    "a seed packet",
    "a compass",
    "a tollbooth",
    "a quilt",
    "a recipe card",
    "a passport stamp",
];
export const LENSES = [
    {
        name: "inversion",
        summary: "Reverse an assumption every obvious answer shares.",
        operator: ({ rng, consensus }) => {
            const orthodoxy = consensus.orthodoxies.length
                ? pick(rng, consensus.orthodoxies)
                : "the problem should be solved by adding something";
            return {
                stimulus: `orthodoxy: ${orthodoxy}`,
                instruction: `Every conventional answer assumes: "${orthodoxy}". Assume the exact opposite is true and design ideas that only make sense in that inverted world. Then make them work in this one.`,
            };
        },
    },
    {
        name: "far-analogy",
        summary: "Transplant a working mechanism from a remote domain.",
        operator: ({ rng }) => {
            const domain = pick(rng, REMOTE_DOMAINS);
            return {
                stimulus: `domain: ${domain}`,
                instruction: `Study how ${domain} solves a structurally similar problem. Name the specific mechanism it uses, then transplant that mechanism, not its surface imagery, into this problem.`,
            };
        },
    },
    {
        name: "first-principles",
        summary: "Strip to physical, economic or behavioural primitives and rebuild.",
        operator: () => ({
            instruction: "Ignore every existing solution category. List the irreducible primitives of this problem (the physics, the money, the human behaviour, the information flow). Rebuild a solution from those primitives alone, as if no industry had ever tackled it.",
        }),
    },
    {
        name: "constraint-flip",
        summary: "Impose an absurd constraint and solve under it.",
        operator: ({ rng }) => {
            const c = pick(rng, ABSURD_CONSTRAINTS);
            return {
                stimulus: `constraint: ${c}`,
                instruction: `Add a hard constraint: ${c}. Solve the problem fully under that constraint. Keep the ideas whose core survives when the constraint is relaxed.`,
            };
        },
    },
    {
        name: "extreme-user",
        summary: "Design for a user at the edge of the distribution.",
        operator: ({ rng }) => {
            const u = pick(rng, EXTREME_USERS);
            return {
                stimulus: `user: ${u}`,
                instruction: `Design only for ${u}. What would they need that the mainstream solution ignores? Then find which of those ideas would be better for everyone.`,
            };
        },
    },
    {
        name: "subtraction",
        summary: "Remove the component everyone treats as essential.",
        operator: ({ consensus }) => ({
            instruction: `Identify the single component that every obvious answer depends on${consensus.obvious.length ? ` (look at: ${consensus.obvious.slice(0, 4).join("; ")})` : ""}. Remove it entirely. Design ideas that solve the problem without it.`,
        }),
    },
    {
        name: "scale-shift",
        summary: "Move the problem to a radically different scale of size or time.",
        operator: ({ rng }) => {
            const s = pick(rng, [
                "one second",
                "one hundred years",
                "one billion users",
                "a single atom of the problem",
                "a whole city",
                "one transaction",
            ]);
            return {
                stimulus: `scale: ${s}`,
                instruction: `Reframe the problem at the scale of ${s}. What becomes obvious at that scale that is invisible at the usual one? Bring that insight back.`,
            };
        },
    },
    {
        name: "enemy-as-resource",
        summary: "Turn the failure mode or adversary into the fuel.",
        operator: () => ({
            instruction: "Name the thing that most often kills solutions to this problem (the failure mode, the adversary, the waste product, the friction). Design ideas where that exact thing becomes the resource that makes the solution work.",
        }),
    },
    {
        name: "conceptual-blend",
        summary: "Fuse the problem with an unrelated object.",
        operator: ({ rng }) => {
            const o = pick(rng, RANDOM_OBJECTS);
            return {
                stimulus: `object: ${o}`,
                instruction: `Blend this problem with ${o}. List three structural properties of ${o} (not its looks), and build ideas that inherit those properties.`,
            };
        },
    },
    {
        name: "abductive",
        summary: "Imagine the surprising fact that would make the problem trivial.",
        operator: () => ({
            instruction: "Imagine a surprising observation that, if it were true, would make this problem trivially easy. Work backwards: which of those observations could be made true on purpose? Design ideas that manufacture them.",
        }),
    },
    {
        name: "future-back",
        summary: "Look back from a world where this was solved long ago.",
        operator: ({ rng }) => {
            const y = pick(rng, ["2035", "2050", "2100"]);
            return {
                stimulus: `year: ${y}`,
                instruction: `It is ${y} and this problem was solved so long ago that people find the 2020s approach quaint. Describe how it is solved, then name the first version that could ship today.`,
            };
        },
    },
    {
        name: "who-pays",
        summary: "Change who pays, who benefits, or what the unit of value is.",
        operator: () => ({
            instruction: "Change the economics: a different payer, a different beneficiary, a different unit of value, or a different moment of payment. Design ideas that only work because the money moves differently.",
        }),
    },
];
export function lensByName(name) {
    return LENSES.find((l) => l.name === name);
}
//# sourceMappingURL=lenses.js.map