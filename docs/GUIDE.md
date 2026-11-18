# The consulting guide

For every engine in the fleet that has ever produced the answer everyone else would have produced.

---

## The idea in one paragraph

Every model, asked a question, starts from the middle. That is what a model is: the most likely next thing. For most work the middle is fine. For the work that decides whether a venture grows, the middle is where your competitors already are. This engine does one job. It finds the middle on purpose, writes it down, and then forbids itself from going there. What comes back is a small set of ideas that are measurably outside the consensus, that survived an adversary trying to expose them as the obvious answer in disguise, and that still have a first step you could take this week.

You do not hand your thinking to it. You consult it, the way you would ask the one colleague who always says "what if we did the opposite", and then you decide.

---

## What it looks like

A real run, 18 November 2026, two model calls, about $0.15, 85 seconds.

**Problem:** How can an independent bakery compete with supermarkets?

**What the engine says everyone else will say** (abridged): bake fresher, specialise in sourdough or gluten free, know your regulars by name, sponsor local events, take cake orders, post on Instagram, charge a premium, add a café, start a loyalty card, sell wholesale.

**The assumptions all ten share:** the supermarket wins on price and convenience and cannot be attacked directly; the unit of value is the loaf and the counter; the bakery stays a standalone shop; the owner's job is to work harder at marketing, not to change the economics of production.

**What came back:**

1. **Bake for dinner, not breakfast.** Supermarket bakery shelves are baked early and picked over by late afternoon. Move the main bake to 2pm to 6pm so loaves come out warm as commuters head home to cook. The bakers stop working 3am shifts, which makes staff easier to hire. *First step: move one popular loaf to a 4pm bake for two weeks and compare sell-through.*
2. **Brew kvass from unsold bread.** Turn the largest structural loss into a second product with drink margins and a shelf life measured in weeks. *First step: a 10 litre test batch from three days of leftovers.*
3. **Publish a glucose-response study with a dietitian.** Ten volunteers, continuous glucose monitors, your long-fermented loaf against supermarket sliced bread. If the difference is real, local clinicians have a reason to send patients to you, and no supermarket can copy it.
4. **A neighbour's recipe, baked under their name, every week.** Each submitter becomes a distribution channel into their own family.

None of those is on the consensus list. Each one attacks an assumption the list shared. That is the whole point.

---

## The six moves

Think of these as a ladder. Start at the bottom. Climb only when the rung below did not answer the question.

| Move | Calls | Cost | Reach for it when |
|---|---|---|---|
| `record_outputs` | 0 | $0 | You shipped something. Tell the engine, so it never hands it back to you. |
| `score_divergence` | 0 to 1 | $0 with a known consensus | You already have outputs and want to know if they are the default in disguise. |
| `map_consensus` | 1 | cents | You want to see the default before deciding whether to leave it. |
| `provoke` | 2 | about $0.15 (measured) | You need a few genuinely fresh options, often and cheaply. |
| `challenge` | 3 | cents | You have one idea or plan and want it attacked and pushed further out. |
| `diverge` | 25 to 40 | dollars | A number is stalled and the obvious plays are spent. |

### `record_outputs`: the engine's memory of you

Every namespace keeps a memory. Ideas the engine hands out go into it automatically. Things you shipped yourself go in when you record them. After that, anything too close to your history is flagged on `score` and rejected on `provoke` and `diverge`.

```json
{ "namespace": "growth-heartside:jokes", "items": ["the caption of every post that went live this week"] }
```

Seed it once with everything you have already published. It costs nothing and it is the reason the engine can tell you "you have said this before" months from now.

### `score_divergence`: a mirror for your own outputs

Give it your drafts and a list of the conventional answers. It tells you, for each draft, whether it sits inside the consensus cluster, whether it repeats your history, whether it contains a word from your kill list, and how far out it is.

```json
{
  "problem": "Hooks for this week's Notes",
  "obvious": ["the hooks that went out last week", "the generic openers you never want to use"],
  "ideas": ["draft hook one", "draft hook two"],
  "namespace": "growth-makeyourmindup:hooks",
  "bannedWords": ["delve", "unlock", "in today's"]
}
```

Run it in front of a gate you already have. It is a second pair of eyes that reads meaning, where your existing checks read characters.

### `map_consensus`: see the middle first

One call returns what most people and most models would say, and the assumptions they all share. Often that is enough. Reading the assumptions alone tends to suggest the move.

### `provoke`: fresh options on demand

Two calls. The engine maps the consensus, then generates through four randomly chosen thinking lenses with the consensus as forbidden territory, and returns the most remote options that are also different from each other. Use it for the daily wildcard slot, the brief that keeps getting the same answers, the concept stage before you spend credits on generation.

### `challenge`: put your best idea in the ring

Give it one idea. It names the conventional thing your idea is secretly closest to, the strongest reason it would fail, the rival idea someone with the opposite instinct would propose, and a mutation that keeps your idea's strangest part, answers the flaw, and moves further from the default. It also tells you if the mutation slid back toward the middle, so you know whether to take it.

### `diverge`: the full run, for when it counts

Map, then waves of generation through twelve lenses chosen by a bandit that learns which lenses work for your namespace, then a novelty gate, then an adversary and a synthesizer, then a blind judge, then a portfolio chosen to be strong and mutually different, then one hybrid of the two most complementary ideas. Each spark comes with its lineage, the conventional idea it beats, the flaw it survived, and a prompt your downstream step can run as is.

Reserve it for the moments your protocol already names: a stalled number, a bold swing, three recovery plays each different in kind.

---

## The twelve lenses

Each is a way out of the middle. The engine picks them for you, but knowing them helps you read the output and force one when you want it (`lenses: ["inversion"]`).

| Lens | The move |
|---|---|
| inversion | Take an assumption every obvious answer shares and assume the opposite. |
| far-analogy | Transplant a working mechanism from a remote field: beekeeping, air traffic control, jazz, the immune system. |
| first-principles | Rebuild from the physics, the money, the behaviour and the information flow, as if no industry existed. |
| constraint-flip | Solve under an absurd constraint, then keep what survives relaxing it. |
| extreme-user | Design for the edge of the distribution, then find what is better for everyone. |
| subtraction | Remove the component every answer depends on. |
| scale-shift | Look at the problem at one second, one hundred years, one billion users, or a single transaction. |
| enemy-as-resource | Make the thing that kills solutions into the fuel. |
| conceptual-blend | Fuse the problem with an unrelated object and inherit its structure. |
| abductive | Imagine the surprising fact that would make the problem trivial, then manufacture it. |
| future-back | Look back from a year when this was solved long ago. |
| who-pays | Change who pays, who benefits, or what the unit of value is. |

---

## Connecting your repo

### From a Claude Code session (works today)

```bash
claude mcp add divergent -- node /path/to/divergent-thinker/dist/mcp.js
```

The six moves appear as tools. The session needs `ANTHROPIC_API_KEY` in its environment for any move that generates. `score_divergence` with a supplied consensus and `record_outputs` need no key at all.

### From a script, runner or n8n (works today, local)

```bash
DIVERGENT_TOKEN=pick-one npm run serve      # http://127.0.0.1:8787
```

```python
import json, urllib.request

def consult(route, body, token):
    req = urllib.request.Request(
        f"http://127.0.0.1:8787/{route}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=600) as r:
        return json.load(r)

report = consult("score", {"problem": "...", "obvious": [...], "ideas": [...], "namespace": "growth-heartside"}, TOKEN)
```

### From TypeScript

```ts
import { createEngine } from "divergent-thinker";
const engine = await createEngine();
const { sparks } = await engine.provoke({ problem, namespace: "content-engine-ideas", target: "writing" });
```

### Through Control Center (planned)

Growth runners hold no model keys, by design. The planned route is `POST /api/growth/engines/<slug>/divergent`, built the same way as the humour route: Control Center's key, your engine's own bearer, a daily cap, every call metered. Until it ships, use the session or local routes above. See [integration-plan.md](integration-plan.md).

---

## Conventions that make it work

**One namespace per consumer, sub-namespaces per lane.** Use your engine id (`growth-heartside`), and a suffix for a lane with its own history (`growth-heartside:jokes`, `content-engine-ideas`). Memory and lens learning are per namespace, so a shared namespace means you are avoiding someone else's history.

**Bring your kill list.** Every repo in the fleet already keeps one: `SLOP`, `BANNED`, `kill-list.v1.json`, the floor of rejected lines. Pass it as `bannedWords`. Pass your already-tried plays as `cliches`, so the engine has to go past them instead of rediscovering them.

**Pick a target.** `strategy`, `writing`, `video`, `design`, `product`, `research` or `code` shapes the ready-to-run prompt on each spark for whatever step comes next.

**Pick a temperament.** `grounded` weights usefulness and lets the judge decide borderline cases. `balanced` is the default. `wild` demands more distance and tolerates more risk. Use `wild` for concept work where a miss costs nothing, `grounded` for anything that reaches a customer.

---

## What to do with what comes back

- **Reduce to one.** The engine returns a portfolio. Your step returns a recommendation. Pick the spark, say why, and keep the others in the trace.
- **Keep the label.** An idea the engine proposed is engine-sourced. It goes through your normal proposal and approval flow, never presented as anyone's own.
- **Read the conventional twin.** Every spark that went through the adversary names the obvious thing it beats. That line is your guardrail when you execute: if the build starts drifting toward it, you are rebuilding the default.
- **Record what ships.** Close the loop with `record_outputs`, and the engine gets sharper for you over time.

---

## Where it should not go

- **Anywhere a fact is needed.** The engine has no sources. It proposes; it does not cite.
- **Anywhere the words must be exact.** Quotes, approved copy, verbatim questions, a claim that must match a concept word for word.
- **Anywhere a model must not run.** Some engines are model-free by their North Star. Respect it.
- **As a judge of taste.** It measures distance from the consensus. Whether something is good is still yours to decide, with your own judges.
- **Into a menu.** If you pass four sparks straight to a human, you have handed back the work the engine was meant to save.

---

## How it stays honest

- **The novelty gate is calibrated on real embeddings, not guessed.** On a held-out set it rejected 15 of 15 reworded consensus answers and passed 15 of 15 genuinely non-obvious ones (`npm run calibrate`).
- **A dialectical synthesis that slides back toward the middle is thrown away,** and the original kept. Debate tends to split the difference; this one is not allowed to.
- **The judge is blind and calibrated against the consensus answers,** which score 1. Two shuffled passes are averaged. Strange but useless scores low on purpose.
- **Every run has a hard call ceiling,** and every report says what it cost.
- **The engine is measured against a single well-written prompt, not a lazy one.** If it cannot beat that, it says so. See the benchmark section of [integration-plan.md](integration-plan.md).

---

## A block to paste into your AGENTS.md

```markdown
## Consulting divergent-thinker

When the obvious answer is not good enough, consult divergent-thinker
(krishanraja/divergent-thinker, docs/GUIDE.md). Namespace: <your-engine-id>.

- Before a gate: `score_divergence` against recent outputs and our kill list. Zero cost.
- After shipping: `record_outputs` with what went live. Zero cost.
- For a wildcard or a stale brief: `provoke`.
- At U4 or U5 with nothing proposed: `diverge`, target `strategy`, with our spent plays as `cliches`, then `challenge` on the top play.

Its sparks are proposals. Reduce them to one recommendation, keep them labelled
as engine-sourced, and send them through the normal approval flow.
```

---

The middle will always be there. It is where the first draft lives, and it is a fine place to start. This engine exists so that it is never where you stop.
