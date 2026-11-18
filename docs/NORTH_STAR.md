# North Star

Status: Set (Ruling, Krish, 2026-11-18). Target and deadline proposed, awaiting his confirm.
Owner: Krish Raja

The fleet stops settling for the first answer. Every engine that has to find a new route to its number can consult this one, and the ideas it brings back are good enough that Krish says yes to them, week after week, and they move a venture's number.

The engine earns its place only one way: Krish approves ideas it made. Distance from the consensus, benchmark wins and clever output count for nothing on their own.

## The number

```yaml north-star-metric
metric: "Engine-made ideas Krish approves per week, across the fleet"
unit: count
direction: up
target: 5            # proposed 2026-11-18, awaiting Krish's confirm
deadline: 2026-12-28 # proposed, the Monday of the week the growth ladders end
ladder_shape: linear
source: "Krish's approvals of ideas this engine produced (a spark, a mutation or a hybrid), counted in docs/approvals.md until Control Center tags engine-sourced proposals"
status: active
ladder: pending-baseline
```

## What counts

- An idea counts when Krish approves it in the consuming engine's normal flow (his press on a proposal, a Clear on his one list, or his yes in a session), and the idea came from this engine.
- An idea he approves after editing counts. An idea he rejects, or that is never put in front of him, does not.
- One idea counts once, in the week he approved it.

Only Krish changes this file.
