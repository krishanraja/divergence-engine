import type { ConsensusMap } from "./types.js";
/**
 * Cognitive lenses: each is an operator that forces the generator off its default path.
 *
 * Current Claude models no longer accept sampling temperature, so diversity cannot be
 * bought with randomness at the token level. It has to be engineered at the prompt level:
 * a different operator, a different stimulus, and an explicit map of territory to avoid.
 * Every lens therefore takes a stimulus drawn from a seeded RNG.
 */
export interface Lens {
    name: string;
    summary: string;
    /** Builds the operator instruction for one call. */
    operator(ctx: LensContext): {
        instruction: string;
        stimulus?: string;
    };
}
export interface LensContext {
    rng: () => number;
    consensus: ConsensusMap;
}
export declare const REMOTE_DOMAINS: readonly ["mycology and fungal networks", "beekeeping", "jazz improvisation", "the human immune system", "medieval craft guilds", "origami and fold mathematics", "air traffic control", "sourdough fermentation", "coral reef ecology", "chess opening theory", "cartography and map projection", "monastic orders", "professional poker", "ant colony foraging", "opera stagecraft", "glaciology", "perfumery", "falconry", "Formula 1 pit stops", "close-up card magic", "lichen symbiosis", "typography and type design", "railway signalling", "spider silk engineering", "19th century postal systems", "insurance underwriting at Lloyd's", "tidal and lunar cycles", "wine blending", "search and rescue triage", "sumo stables", "shipping container logistics", "bonsai cultivation", "improv theatre", "venom pharmacology", "seed banks and the Svalbard vault", "carnival and fairground economics", "orchestral conducting", "geology of river deltas", "hospital infection control", "the game of Go", "street food markets in Bangkok", "Antarctic research stations", "translation of poetry", "speedrunning video games", "court stenography", "dairy cooperatives", "tattoo artistry", "submarine operations", "museum conservation", "migratory bird navigation"];
export declare const ABSURD_CONSTRAINTS: readonly ["it must cost nothing to run", "it must work with no internet connection", "it must be finished in one hour", "it must work at one thousand times the current scale", "it must work for exactly one person", "it must have no screen and no text", "it must be explainable to a seven year old in one sentence", "it must make money from the people who currently get it free", "it must survive the disappearance of its main supplier", "every user must also be a contributor", "it must get better the more people try to break it", "it must take one hundred years to pay off"];
export declare const EXTREME_USERS: readonly ["a 90 year old who has never used a smartphone", "a ten year old", "a hostile competitor who wants it to fail", "an AI agent with no human in the loop", "someone in a crisis with ten seconds of attention", "the most expert person in the world at this", "someone who has to pay for it with their own money tonight", "a regulator", "a person with no shared language", "a power user who will automate everything"];
export declare const RANDOM_OBJECTS: readonly ["a lighthouse", "a vending machine", "a pressure cooker", "a library card", "a metronome", "a pawn shop", "a sundial", "a ransom note", "a hot air balloon", "a fishing net", "a time capsule", "a lottery", "a field hospital", "a jukebox", "a seed packet", "a compass", "a tollbooth", "a quilt", "a recipe card", "a passport stamp"];
export declare const LENSES: readonly Lens[];
export declare function lensByName(name: string): Lens | undefined;
