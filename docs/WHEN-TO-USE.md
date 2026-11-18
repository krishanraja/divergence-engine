# When to use divergent-thinker

For any session, in any repository in the fleet, deciding whether to consult the engine and how to do it from where it stands. Read this first. [GUIDE.md](GUIDE.md) goes deeper on each move.

---

## The thirty-second version

**Reach for it when the obvious answer is not good enough, and it is cheaper to find out now than after you build.** It tells you what everyone else would do, gives you ideas measurably outside that, and tells you whether your own drafts are the default in disguise.

**Leave it alone when the answer must be exact, factual, or Krish's own words.** It has no sources and no taste of its own.

**Cheapest first.** Checking your own output costs nothing. Fresh ideas cost about 15 cents. A full run costs about a dollar and is for when a number has stalled.

---

## The five signals

Reach for it when any of these is true.

1. **A number has stalled.** Your repository is at U4 or U5 and nothing new is proposed. The protocol already asks for "three unconventional recovery plays, each different in kind"; this is what makes them.
2. **The ideas keep coming back the same.** The last three briefs, boards or batches drew the same family of answers. Something upstream is anchored.
3. **You are about to commit to an angle, a plan or a campaign** and you have only considered the first version that came to mind.
4. **A draft feels familiar.** A hook, caption, title, pitch opener or play reads like something you or everyone else has already said.
5. **Something just shipped.** Record it, so nobody in your namespace is handed it again.

## The five stops

Do not use it for these, however tempting.

1. **Facts, numbers, citations.** It has no sources. Cited or silent still holds.
2. **Exact words.** Approved copy, quotes, verbatim questions, a claim that must match a concept word for word, anything in Krish's name that the voice check owns.
3. **Taste and judgment.** It measures distance from the consensus. Whether something is good is Krish's call, and your own judges'.
4. **Anywhere a model must not run.** Some repositories are model-free by their North Star. Respect it.
5. **A menu for Krish.** If its sparks go to him unreduced, you have handed back the work it was meant to save.

---

## Which move

```
Is the output already written?
  yes -> score it (free with a known consensus). Flagged? Rework it, or challenge it.
  no  -> Do you have one idea you are about to commit to?
           yes -> challenge it (3 calls): its conventional twin, its fatal flaw, a stronger mutation.
           no  -> Do you just need to see the default?
                    yes -> map (1 call).
                    no  -> Is a number stalled, or is this a decision that sets weeks of work?
                             yes -> diverge (about $1, one a day per caller).
                             no  -> provoke (about $0.15).
Shipped something? -> record it (free).
```

| Move | What you get | Calls | Cost | Time |
|---|---|---|---|---|
| `score` | each draft's status: accepted, or why not (too close to the consensus, a repeat, a kill-list word) | 0 with `obvious` | $0 | seconds |
| `record` | nothing back but memory: what shipped is never handed back | 0 | $0 | seconds |
| `map` | what most people and models would say, and the assumptions they share | 1 | cents | about 20 s |
| `provoke` | a few fresh ideas outside the consensus, different from each other | 2 | about $0.15 (measured) | about 90 s |
| `challenge` | the conventional twin of your idea, its fatal flaw, a rival idea, a stronger mutation | 3 | cents | about 60 s |
| `diverge` | the full run: scored sparks with lineage, the twin each beats, the flaw each survived, a ready-to-run prompt | about 25 | $0.91 to $1.37 (measured) | about 4 min |

---

## How to call it from where you are

| You are | Door | Notes |
|---|---|---|
| A growth engine's scheduled run | `POST /api/growth/engines/<slug>/divergent` on the engine's own bearer | check `features.divergent` in capabilities first |
| A session in a growth repository | `python3 growth.py divergent <op> ...` (growth-heartside, growth-makeyourmindup) or `npm run divergent -- <op> ...` (growth-mindmake) | same flags everywhere, below |
| A session in content-engine | `python3 scripts/post-pack/divergent.py <op> ...` | paid moves check the $15 chain cap first |
| Any of Krish's own Claude sessions (claude.ai, Claude Code cloud, Codex) | Control Center connector tools `divergent_score`, `divergent_record`, `divergent_run` | pass the consuming engine's slug as `namespace` so memory is shared |
| A machine with the repo checked out and an Anthropic key | the local MCP server (`claude mcp add divergent -- node dist/mcp.js`) or the CLI | memory stays on that machine |
| Any other repository that is no growth engine | `POST /api/divergent/<caller>` once Control Center lists it in `DIVERGENT_CALLERS` | ask Krish; a new caller is one line and a bearer |

**The same flags in every repository's command:** `--problem`, `--context`, `--idea` (challenge), `--ideas-file` and `--obvious-file` (score), `--items-file` (record), `--cliche` (repeatable), `--count`, `--target`, `--temperament`, `--lane`, `--judge`. Exit 0 is done, 1 is flagged, 2 is not served, capped, uncalibrated or held: never treat 2 as a pass.

---

## The fleet, repository by repository

| Repository | Use it for | Moves | Namespace | Status |
|---|---|---|---|---|
| growth-heartside | U4 and U5 recovery plays; the joke lab's retread screen; recording what went live | `diverge`, `score`, `record`, plus anything at will | `growth-heartside`, `growth-heartside:jokes` | wired, draft #128 |
| growth-mindmake | U4 and U5 routes to good meetings; the weekly experiment against the default; generic pitch openers (shadow) | `diverge`, `map`, `score`, `challenge` | `growth-mindmake`, `growth-mindmake:pitches` | wired, draft #146 |
| growth-makeyourmindup | U4 and U5 borrowed-audience plays; the hook guard before the mix plan; recording live posts | `diverge`, `score`, `record` | `growth-makeyourmindup`, `growth-makeyourmindup:hooks` | wired, draft #132 |
| content-engine | the daily wildcard; the repeat guard beside `repeat_review`; a piece's angle before the lock; directed shoots | `provoke`, `score`, `record`, `map`, `challenge` | `content-engine:ideas` and lanes | wired, draft #849 |
| growth-legibility, growth-fulltime | the same as the other growth engines | as above | their slugs | held: wire on release, copying growth-heartside |
| Krish's own sessions | strategy-brief alternatives, the sharper alternative to a call, design's divergence arm, a reset after rejected mocks | `map`, `challenge`, `score`, one `diverge` arm | the venture's slug | connector tools, live with control-center#963 |
| AEO-Engine | flag recommendation angles that only repeat the first-cited pages, as a flag, never a filter | `score` | `aeo-engine` | optional; never on the questions it measures |
| hunter | catch boilerplate cover-letter hooks | `score` | `hunter` | optional; its generation is anchored to evidence on purpose |
| higgsfield work | concept stage of a thumbnail or faceless video, before any generation spend | `provoke` with `target: design` or `video` | the venture's slug | from a session, through the connector |
| humour-engine | downstream partner: divergent-thinker makes comic variants, humour-engine checks they land | none inside it | none | never its judge |
| inspirationhouse | supplies the rejection floor and cues that become other namespaces' `cliches` and `bannedWords` | none | none | supplier |
| content-watcher, krish-clone | none: model-free or no creative step | none | none | no |

---

## Writing a call that works

The engine is only as good as the problem you hand it.

- **`problem`: the real outcome, the number and the gap, in one paragraph.** Good: "Organic posts that produce the first stranger orders for custom dog gifts, $0 today, $10,000 a month the goal." Weak: "Ideas for social media."
- **`context`: the walls it must respect.** No paid ads, every send approved, US spelling, 20 minutes a day. The engine reads them; your own checks still enforce them.
- **`cliches`: what you already tried or already know.** The engine treats them as forbidden territory and has to go past them. This is the single most useful field.
- **`bannedWords`: a kill list for ideas, and only that.** Puffery and banned voice (`SLOP`, the kill list's vocabulary). The gate rejects any idea that contains one, so never pass words another check owns: "research", "new", a person's name. On 18 November two repositories nearly did, and would have received nothing.
- **`temperament`:** `grounded` for anything that reaches a customer, `balanced` by default, `wild` for concept work where a miss costs nothing.
- **`target`:** what the next step makes (`strategy`, `writing`, `video`, `design`, `product`, `research`, `code`). It shapes the ready-to-run prompt on each spark.

## What to do with what comes back

1. **Check every spark against your own walls before Krish sees it.** The engine scores originality and usefulness, not policy. Its first live runs proposed one play that used strangers' photos without consent and one that would have sold AI-made work into communities that ban it. Both read well.
2. **Reduce to one.** Propose the best spark that passes; keep the others in your notes.
3. **Label it.** A proposal built from a spark carries one evidence item: `{ "label": "divergent-thinker spark <id>, run <run>", "url": null }`. That is how Control Center counts Krish's approvals, which is this engine's North Star.
4. **Keep the conventional twin in view while you build.** If the work drifts toward it, you are rebuilding the default.
5. **Record what ships.**

## When it answers with an error

| Answer | Meaning | Do |
|---|---|---|
| 404 `divergent_not_supported`, or `features.divergent` false | not live yet | carry on as you would without it |
| 409 `engine_held` | your engine is held | only `score` and `record` run |
| 403 `namespace_not_yours` | wrong namespace | use your slug or `<slug>:<lane>` |
| 429 `daily_*_cap_reached`, `daily_usd_ceiling_reached` | today's allowance is spent | wait for tomorrow; never route around it |
| 503 `embedder_uncalibrated` | the gate has not measured Control Center's embedder yet | one `divergent_score` from a session calibrates it |
| 503 `daily_spend_unreadable` | the ledger could not be read | it refuses rather than overspend; try later |

---

## Questions sessions ask

**Will it replace our own ideation?** No. It is one input. Your own pipeline, judges and Krish's taste still decide.

**Is it worth a dollar?** For a decision that sets weeks of work, yes: on 18 November Krish approved both of its first two plays. For a daily slot, `provoke` at 15 cents. For checking a draft, `score` at nothing.

**Can it see what we shipped?** Only what you `record`, and what it handed you. Record every launch.

**Is it creative or just weird?** Its gate rejects rewordings of the consensus, its judge punishes strange-but-useless, and its score is a geometric mean, so neither alone can carry an idea. On its benchmark it went further from the consensus than a well-written single prompt on every problem, with usefulness held.

**Who decides what it may spend?** Krish: per caller per day, one `diverge`, twenty quick calls and $5; content-engine's calls count inside its $15 weekly chain cap.
