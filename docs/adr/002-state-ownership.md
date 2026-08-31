# ADR-002: state ownership — per-slice controlled, URL over local, no global store

- **Status:** Accepted
- **Date:** 2026-08-31
- **Step:** 2.5 (state architecture)
- **Related:** `docs/state-architecture.md` (the tier table this ADR defends);
  ADR-008 (package boundary — this project has one consumer today, `apps/web`,
  but is built assuming more later, same motivation as that ADR).

## Context

The design doc names a state ownership tier list as a required deliverable:
URL (`nuqs`), server cache (TanStack Query), component-local, controlled
props, and — deliberately — no global store. Three parts of that list are not
self-evidently right and needed to be argued through rather than assumed:

1. Should `DataTable` control all its state itself (with `on*Change`
   callbacks as an escape hatch, TanStack Table's model), or should the
   consumer control it, slice by slice?
2. Given sort/filter *are* controlled by the consumer, why put that state in
   the URL specifically, rather than the consumer's own component state?
3. Why no global store (Zustand/Redux/Context) anywhere in this design?

## Decision

**1. Per-slice controlled, never internal fallback.** Each stateful feature
(sorting today; selection or similar later) is opt-in by whether its
controlled-prop pair (`state` + `onChange`) is present — not by falling back
to component-internal state when the consumer omits it. Omit the pair and
that feature's UI does not render at all; there is no hidden internal state
standing in for it.

**2. Sort/filter state lives in the URL via `nuqs`**, not in `apps/web`'s own
component state, even though `apps/web` is the one consumer controlling it
today.

**3. No global store.** Server-fetched data lives in TanStack Query;
whichever slice of UI state a given consumer decides must be shareable
(sort and filter, today) lives in the URL; everything else (`scrollTop`,
viewport size, computed column widths) is component-local to `DataTable`
itself and never escapes it.

## Why

**Per-slice controlled, not TanStack's per-slice-with-internal-fallback.**
TanStack Table can safely fall back to internal state for a slice you don't
wire up, because it is headless — an internal, untracked `sortState` has no
visible consequence if you never render anything driven by it. `DataTable`
is not headless: it renders the actual sort indicator and (later) selection
UI. An internal fallback here is not harmless bookkeeping, it's a footgun —
a consumer forgets to wire `sortState`/`onSortChange`, the table sorts anyway
using hidden internal state, everything *looks* correct, and then reload or
share silently loses that view because nothing was ever pushed to the URL.
That's the exact "second source of truth" failure this project's
controlled-only stance exists to prevent, reopened one slice at a time. The
fix is structural rather than disciplinary: a feature's UI simply doesn't
exist unless the consumer supplies its controlled pair. This is also what
makes the package genuinely reusable across future consumers with different
needs — consumer A wires only sort, consumer B wires sort and selection —
without any consumer being able to accidentally end up with untracked state.

**URL over consumer-local state, even for a single consumer today.** The
concrete failure mode is state duplication: if the *intent* is that sort
should be shareable/reload-safe, and it's implemented by mirroring a
`useState` into the URL by hand, there are now two places sort state can
live and two places it can be wrong — a listener that doesn't fire, an
update order that races the URL, a stale closure over the old value. Putting
the URL itself in the write path (`nuqs`'s hook *is* the state, not a mirror
of it) removes the duplication rather than managing it. This holds even
though today's `apps/web` is the only consumer with an opinion about where
that state should live — the moment the mirroring approach were introduced,
it would still be one extra source of truth, one extra place to get the sync
wrong, independent of consumer count.

**No global store.** The tier list above accounts for every kind of state
this project has: fetched data (TanStack Query owns cache/dedupe/invalidation
already, a global store would duplicate it), shareable UI state (URL already
makes it available to any component app-wide, so a store would be a second
way to reach the same values), and layout mechanics (component-local because
nothing outside `DataTable` needs them). There is no fourth category of state
left over that a global store would be the only way to serve. The trigger
that would change this: a piece of state that (a) several unrelated
components need to read or write, (b) must not go in the URL (too large, or
not meaningful to share/bookmark — e.g. a multi-step in-progress draft), and
(c) isn't owned by a single fetch. Nothing in this project's current or
planned scope is shaped that way.

## Options considered

### Rejected: TanStack Table's per-slice-with-internal-fallback model

Genuinely tempting — it's the shipped, proven pattern from the library this
project's own column-def API is modeled after. Rejected because it is safe
specifically because TanStack Table is headless and this component is not;
adopting the same fallback here would let an unwired feature "work" locally
while silently breaking shareability, which is the one property this project
has decided isn't optional.

### Rejected: sort/filter as `apps/web`-local `useState`, manually synced to the URL

Keeps the URL as a display/bookmarking concern layered on top of the "real"
state living in the component tree. Rejected because manual sync is
duplicated state by construction — two things claim to be the source of
truth, and every additional sync point (mount, back-button, external link)
is a fresh chance for them to disagree.

### Rejected: a global store (Zustand/Redux/Context) for cross-cutting UI state

Would have made sort/filter/selection reachable from anywhere without
threading props. Rejected because nothing in this project needs cross-cutting
*reach* that the URL doesn't already provide for free — a store here would
be a second way to read state that's already globally available, not a new
capability.

## Consequences

- `DataTableProps` will need one controlled-prop pair per stateful feature,
  each independently optional — this is the shape `types.ts` has to commit
  to when sorting (and later, selection) is added.
- A consumer that wants a feature must supply real state, wired to something
  real (the URL, or anything else) — there is no "just render it and figure
  out state later" path.
- Every reload/share/back-button scenario for sort or filter is provably
  correct by construction (the URL *is* the state), not by convention that
  could drift.
- If the escalation trigger above is ever met, this ADR is the place to
  revisit — not something to silently work around with a local store bolted
  onto one feature.

## References

- [TanStack Table — Table State guide (per-slice `state`/`on*Change`, internal fallback for unwired slices)](https://tanstack.com/table/v8/docs/framework/react/guide/table-state)
- [nuqs — type-safe URL state for React/Next.js](https://nuqs.dev/)
- [47ng/nuqs](https://github.com/47ng/nuqs)
- `openstatusHQ/data-table-filters` — reference shadcn-style table with
  sort/filter/pagination fully URL-backed, no duplicated local state.
