# ADR-003: RSC boundary — data crosses, behavior doesn't

- **Status:** Accepted
- **Date:** 2026-08-30
- **Step:** 3 (semantic skeleton)
- **Related:** ADR-008 (package boundary) — same instinct, applied to the
  server/client split instead of the app/package split.

## Context

The component map (RADIO doc, Architecture section) is three files, shadcn's
own pattern: `app/queue/page.tsx` (Server Component, fetches rows) →
`columns.tsx` (`"use client"`, defines `ColumnDef[]`) → `DataTable`
(`"use client"`, receives `rows` + `columns` as plain data).

`ColumnDef` carries render functions — `accessor`, `renderCell`, and
optionally a function `header`. React Server Components can only pass
**serializable** data as props from a Server Component to a Client
Component; functions are not serializable (aside from Server Actions marked
`"use server"`, which are RPC references for server-side mutations, not a
mechanism for shipping render logic). So the question is: where do column
definitions actually get authored, given that constraint?

## Decision

Column definitions are authored **entirely inside a client module**
(`columns.tsx`, `"use client"`) and never cross the server/client boundary at
all. `page.tsx` only fetches and passes `rows` — plain, serializable data —
as props. `columns.tsx`'s `ColumnDef[]` and `page.tsx`'s `rows` are combined
into `DataTable`'s props from within client-side code (a client wrapper, or
`columns.tsx` importing rows through a client-safe path), not by a Server
Component passing functions downward.

**Data crosses the boundary. Behavior does not.**

## Why this isn't just "add `"use client"` and move on"

The naive first instinct — define `ColumnDef[]` in `page.tsx`, pass it as a
prop to `DataTable` — throws exactly the error this ADR exists to prevent:
[shadcn-ui/ui#457](https://github.com/shadcn-ui/ui/issues/457), "Functions
cannot be passed directly to Client Components," filed by someone following
shadcn's own data-table docs and hitting this precise mistake. It is a
well-documented trap, not a hypothetical one.

The fix isn't to route the functions through `"use server"` either — Server
Actions exist for server-side mutation RPCs, not for shipping render
functions to run per-cell on the client; using them here would mean a
network round-trip per cell render, which defeats the entire point of
client-side rendering a table. The actual fix is structural: never let a
function *need* to cross in the first place. If `columns.tsx` defines the
columns directly as client code, there's no serialization boundary for
`ColumnDef`'s functions to cross — the boundary only ever carries `rows`,
which are genuinely serializable.

## Options considered

### Rejected: define `ColumnDef[]` in the Server Component, pass as a prop

The naive approach. Rejected because it's not a style preference — it throws
at runtime, and is the documented, repeated real-world failure
([shadcn-ui/ui#457](https://github.com/shadcn-ui/ui/issues/457)).

### Rejected: mark cell/header render functions with `"use server"`

Turns every column's `renderCell`/`header` into a Server Action reference.
Rejected because Server Actions are designed for server-side mutation calls,
not per-render JSX production — using one here would mean a network request
for every cell render (thousands of rows × columns), and the return value of
a Server Action isn't meant to be arbitrary renderable JSX in the way a cell
renderer needs.

### Rejected: pass pre-rendered Server Component output as children/props

React does allow passing an already-rendered Server Component element as a
prop to a Client Component (the "children slot" pattern), since a rendered
element is serializable data, not a function. Rejected for this case because
the whole value of `ColumnDef` (design doc §2's genericity requirement) is
that one `accessor`/`renderCell` pair applies uniformly across every row —
pre-rendering per row on the server would mean one Server Component
instantiation per cell, re-coupling the render logic to server execution for
every consumer, and losing the reusable, product-agnostic column model this
package exists to provide.

## Consequences

- `columns.tsx` must always be a client module — there is no path where
  column definitions are authored on the server.
- `page.tsx` stays a genuine Server Component: it fetches and passes only
  plain data (`rows`), nothing else.
- Any future column-definition file for a second product surface follows the
  same rule: author it client-side, never pass it down from a server parent.

## References

- [shadcn-ui/ui#457 — the exact failure this ADR prevents](https://github.com/shadcn-ui/ui/issues/457)
- [Next.js: Server and Client Composition Patterns / Boundary guide](https://nextjs.org/docs/app/guides/server-and-client-boundary)
- [vercel/next.js#42408 — tracking issue for the underlying error message](https://github.com/vercel/next.js/issues/42408)
