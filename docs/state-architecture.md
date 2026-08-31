# State architecture

## The rule

Every piece of state in this system gets placed by one question: **does it
need to be shareable, or reload-safe?**

If yes, it goes in the URL. If it's server data, it goes in TanStack Query's
cache. If it's neither, it's a candidate for component-local state — decided
by the rubric below. There is no tier for "state that several components
need to reach," because nothing in this system has turned out to need that
without already being shareable (→ URL) or already being a fetch (→ TanStack
Query) — see ADR-002 for the trigger that would change this.

## Tiers

| Tier | Owner | Holds |
|---|---|---|
| **URL** (`nuqs`) | app | sort, filters, page/cursor, selected report id |
| **Server cache** (TanStack Query) | app | fetched rows, mutation + optimistic state |
| **Component-local** | package | `scrollTop`, viewport size, `computedColumnWidths` |
| **Controlled props** | consumer | sort, selection — anything the URL must drive |
| **Global store** | *nobody* | — |

## Component-local vs. controlled props

Both tiers live "inside" the render tree rather than in the URL or a server
cache, so the line between them needs its own rubric: **does it need to be
controlled, or not?**

`scrollTop`, viewport size, and `computedColumnWidths` don't need to be
controlled — no consumer has a reason to read or drive them from outside
`DataTable`, so they stay component-local. Sort and selection do need to be
controlled, because they're the state a consumer must be able to drive from
the URL (or anything else) to make them shareable — so they're never allowed
to fall back to internal state inside `DataTable`. See ADR-002 for why that's
per-slice (each feature's controlled-prop pair is independently optional)
rather than all-or-nothing, and why an unwired feature's UI doesn't render at
all rather than falling back to a hidden internal copy.

## Why URL over consumer-local state, and why per-slice, not TanStack's model

Full reasoning, evidence, and rejected alternatives: **ADR-002**.

## No global store

Full reasoning and the escalation trigger that would revisit this: **ADR-002**.
