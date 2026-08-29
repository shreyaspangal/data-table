# RADIO: Moderation Queue Data Table

Framework: [RADIO](https://www.greatfrontend.com/front-end-system-design-playbook/framework)
(R 10% / A 20% / D 10% / I 20% / O 40%). Weights are attention, not word count —
Optimization is where most of the judgment calls live.

Scope: Phase 1 only (design-doc §1–11). Anything from §12 onward is out of scope here
and belongs in the Phase 2 ADRs instead of this doc.

Every ADR from Step 2 onward should be traceable back to a claim made in this doc.
Where this build deviates from `docs/data-table-system-design/data-table-system-design.md`,
say so explicitly and why — silent deviation is worse than a documented one.

---

## Requirements (~10%)

<!--
Functional: what must the table do for this product (moderation queue), not what a
generic table could do. Non-functional: scale (row count, real-time?), device targets,
who uses it (a moderator working an 8-hour shift is a different user than a one-off
visitor). Explicitly note what's OUT of scope for Phase 1 and why.
-->

### Functional
- The table serves a triage workflow: a moderator scans reports and takes one action per row — changing its status (pending → reviewing → resolved/dismissed).
- Column-level rendering is generic per the package's design doc (§3.2) — this section doesn't re-derive that; it just names how the product uses it: reference id, reporter, content thumbnail/excerpt, category, severity, status, assignee, report count, reported time. (`reportCount` is the one natural numeric column — the only real exercise of `align: 'end'` and number formatting in this product.)
- The status-change action must be reachable by keyboard, not just a mouse click — this is the product's one write interaction, and baseline accessibility (§3.5) is non-optional in Phase 1, not an extension.
- Failure handling for the one mutation: the optimistic status update rolls back on a failed request, and the failure is surfaced to the moderator (not silently dropped). Concurrent edits use last-write-wins — there's no `updatedAt`/version column in Phase 1, so that's the only behavior the schema can support, and it's an acceptable one for a single-moderator demo, not an oversight.
- Filtering by status is the one interactive control wired through the URL in Phase 1 (backed by reports_status_idx).
- Known seed artifact, not a product decision: the seed assigns non-pending reports an assignee, but the one Phase 1 write (pending → reviewing) doesn't set one — a reviewing row created by that write will visibly lack an assignee other reviewing rows have. Acceptable for Phase 1 since assignment itself is out of scope (see Out-of-scope), but worth knowing it's a seed inconsistency, not a bug to chase.
- Phase 1 loads a fixed recency window: the 100 most recent reports matching the active filter, re-queried per filter change (`WHERE status = $1 ORDER BY reported_at DESC LIMIT 100`, served by reports_status_idx / reports_reported_at_id_idx), with a passive "showing 100 of N" count. No pagination, no infinite scroll.

### Non-functional
- Single audience for Phase 1: a moderator, not a mixed audience with different UX modes — the moderators table has no role field, so there's no data to support a second mode even if we wanted one.
- Sessions are long (a full shift), so the design favors low-friction repetition over one-off convenience.
- Scale target: the package itself must handle thousands of rows (design doc §3.4) — that's a package capability, verified in Step 10, not what the product chooses to load. The product query intentionally loads far fewer, per the 100-row window above, because a triage queue surfaces current work, not an archive, and because Step 10's Lighthouse DOM budget (<1,500 elements) has to hold on the actual product route, not just in the abstract.

### Out of scope (Phase 1)
- Sorting by severity — the package's sort props are reserved on the type but deliberately not implemented in Phase 1 (see Interface); Step 2.5 itself ships in Phase 1, so this isn't blocked on state architecture, it's blocked on the package not wiring sort through yet.
- Search by reference — same underlying reason: no query state is wired through the package's controlled-only contract yet, not a Step 2.5 timing issue.
- Bulk actions — would multiply the one-write-path decision from Step 8 (exactly one mutation, to keep scope to a component milestone).
- Keyboard shortcuts (as in, custom hotkeys like "A to approve") — distinct from keyboard *operability* of the one status-change action, which is required (see Functional). Shortcuts are an interaction-model decision layered on top of baseline a11y, not baseline a11y itself.
- Dual-audience UX (triage vs. audit mode) — no role field, no evidence this is needed yet.
- Pagination / infinite scroll past the 100-row window — reports_reported_at_id_idx already anticipates keyset pagination (see its schema comment), but building it is Phase 2; Phase 1 ships only the passive count.
- Real-time updates / refetch-on-focus — TanStack Query refetches on window focus by default; left as the library default rather than explicitly disabled or embraced, worth revisiting once someone notices a row reorder itself mid-triage.
- Undo — the natural next reflex once optimistic updates exist ("oops, wrong button"), not built because it implies a second write path.
- Row detail view (clicking a row for more than the table shows) — implied by Step 2.5's "selected report id" URL-state entry but not part of Phase 1's one-write-one-filter loop.
- Claiming/assigning a report as a moderator action — the schema supports `assigneeId`, but Phase 1's one write is status-only; a second write path is explicitly deferred (see Bulk actions above for the same reasoning).
- Column visibility / density controls — a package-level feature, not a product one; not built because nothing in Phase 1 needs more than the 8-9 fixed columns.
- Authentication / moderator identity — there's no session model in Phase 1; the seed's `assigneeId` is static, not derived from who's logged in.

---

## Architecture / High-level design (~20%)

<!--
The component map: page.tsx (server) -> columns.tsx (client) -> DataTable (client).
What crosses the RSC boundary and what doesn't, and why (this is ADR-003 material —
state the claim here, defend it there). Where does each piece of state live
(this previews Step 2.5's state-architecture doc — don't duplicate it, just name
the boundary).
-->

Component map
- Three files, shadcn's pattern: app/queue/page.tsx (Server Component, fetches reports via Drizzle, driven by searchParams) → columns.tsx ("use client", defines ColumnDef[] for this product) → DataTable ("use client", the generic package component, receives rows + columns as plain data).
- The boundary is deliberate: ColumnDef carries render functions (accessor, renderCell), and functions can't cross the RSC serialization boundary — so anything that defines how a cell renders has to already be on the client. This is the "data crosses the boundary, behavior doesn't" rule from the plan's settled decisions, and it's exactly the mistake shadcn-ui#457 documents when someone tries to define columns in a Server Component.

State ownership (previewing Step 2.5's state-architecture.md, not duplicating it — just naming which tier each piece of Phase 1 state lives in):
- URL (nuqs): the one Phase 1 filter — status.
- Server cache (TanStack Query): fetched rows, and the Step 8 status-change mutation with optimistic update.
- Component-local: things the package computes for itself and nothing else needs — computedColumnWidths from the ResizeObserver, scroll position.
- Controlled props: sort/selection are reserved in the types now but not implemented — the table never owns this state internally, because Phase 1's one URL-backed filter would race an internal default if the component tried to manage it too.
- No global store: there's exactly one write path and one filter in Phase 1, so nothing yet needs cross-component coordination beyond what URL + TanStack Query already provide.

---

## Data model (~10%)

<!--
Row shape vs ColumnDef shape — why are these different types? What does the table
package need to know about a Row that the app-specific renderer doesn't? Keep this
free of moderation-domain vocabulary in the package's own model (see CLAUDE.md
conventions) — but the app's row shape can and should be domain-specific.
-->

- Two shapes, deliberately different: the package's generic Row/ColumnDef<Row> (doc §8.1) and the product's Report (schema.ts). The package never sees Report — only whatever Row the consumer passes.
- Source of truth vs. derived, and why the line matters: rows/columns are the consumer's source of truth; computedColumnWidths is state the package derives from them plus the viewport. If that boundary moved — if a consumer passed computedColumnWidths in directly — every consumer would need its own ResizeObserver and resize logic just to keep widths correct. Owning that computation once, inside the package, is the entire point of the boundary.
- Why rows + columns as two arrays, not rows that render themselves: if Report carried its own renderRow(), a second product couldn't reuse packages/data-table without reshaping its own data into Report's exact fields, or the package absorbing moderation-specific assumptions to accommodate it. ColumnDef is the seam that keeps the package requirement-#1-compliant (doc §2: "generic enough to reuse across multiple product surfaces").
- The flattened read-model, deliberately: contentThumbnailUrl and reporterAvatarUrl are flat strings on reports, not foreign keys — chosen so accessor: (row) => row.contentThumbnailUrl never needs a client-side join. The reference field (schema.ts's own comment) is the same instinct applied earlier: shape the row for how the table will actually render it.

---

## Interface (API) (~20%)

<!--
The DataTable's public props from the consumer's point of view (not the internal
implementation — that's Step 2's job). What does someone integrating this table need
to pass in, and what do they get out (controlled callbacks, etc.)? This is where you
justify "controlled-only" from the consumer's perspective, not just internally.
-->

- DataTableProps mirrors doc §10.1's core API: rows, columns, getRowId, height, width, caption/aria-label, loading, emptyState, errorState. rowHeight/overscan are dropped for Phase 1 — the doc ties both to virtualization (§16), not built yet.
- No domain actions on the public props, deliberately: unlike a naive onRowAction('approve'|'reject', row), action handling stays entirely inside the app's renderCell closures. Baking action vocabulary into DataTableProps would force every consumer to share moderation's vocabulary, or force the package to grow one method per domain — either way, it stops being the generic component doc §2 requires.
- flex added beyond doc §8.1: the doc's own remainder-splitting answer lives in the deferred §13; Phase 1 uses the flex model TanStack/MUI/AG Grid all converge on instead (ADR-006).
- flex/width are mutually exclusive per column, enforced at the type level (discriminated union: `{width, minWidth?, maxWidth?} | {flex, minWidth?, maxWidth?}`) — not a per-library quirk to paper over, but a clean convergence: MUI silently lets flex override width if both are set, AG Grid says the combination "doesn't work" at all. Making it unrepresentable in the type is stricter than either library, on purpose — this project would rather fail to compile than silently ignore a prop the way MUI does.
- The Step 2 typing problem (accessor's return type flowing into renderCell without a cast) is solved the way TanStack solves it: a `createColumnHelper<Row>()` factory, not a bare `ColumnDef<Row, Value>[]` array. Each `.accessor(fn, { cell })` call infers `Value` from that specific `fn` at the call site — inference happens per-column, before the results collect into an array, which is what makes a heterogeneous column set (thumbnail column returning a string, severity column returning an enum, reportCount returning a number) typeable without a cast on any of them.
- Sort/selection: controlled-only, reserved not implemented. This is the project's own constraint, not the doc's — the doc never mandates controlled vs. uncontrolled. The reason is concrete: status filtering already lives in the URL, so if sort lived in uncontrolled internal state, a moderator sharing a filtered link would hand a colleague a URL that reproduces the filter but silently drops the sort — two sources of truth for "what am I looking at," one of which doesn't survive a reload or a shared link.

---

## Optimizations and deep dive (~40%)

<!--
This is the largest section by design even though Phase 1 defers most actual
optimization work. For each of the following, either (a) state the Phase 1 decision
and its evidence, or (b) name it as explicitly deferred to Phase 2 and say what
would trigger picking it up:

- Rendering strategy: RSC boundary, native <table> vs div+role=grid
- Column sizing: width/flex/min/max model vs content measurement
- Scrolling: single scroll container, sticky header
- Performance: what's the expected ceiling before this needs virtualization?
  (Step 10 will measure this — flag it here as a known unknown, not a guess.)
- Accessibility: what ships in Phase 1 as a baseline (the doc calls this
  non-optional, see design doc §3.5) vs what's deferred
- Testing: which tier catches which class of regression
-->

- Most of doc §12+ (virtualization, content measurement, column virtualization, rich-cell sizing) is deferred wholesale — that's the Phase 1/2 scope boundary itself, not a per-item decision.
- Accessibility is not actually inside the deferred §12+ range — §3.5 sits in §3 ("Requirements exploration"), which is core Phase 1 scope, and it says so explicitly: "a base requirement, not an extension." Only one thing genuinely lives inside the deferred numeric range but ships anyway: loading/empty/error states (§20.3/20.4, built in Step 7) — because the doc frames those as baseline too, not because Phase 1 cherry-picks optimizations early.
- Column sizing: width → flex splits remainder → clamp by min/maxWidth → if fixed widths alone exceed the container, flex falls back to base and the table scrolls (never crush the layout). One <colgroup> + table-layout: fixed shared by <thead>/<tbody> so header and body widths can't drift apart (Step 5).
- Scrolling: single scroll container, sticky <th> — doc §6.2 explicitly rejects split header/body scroll surfaces.
- Performance ceiling: unmeasured, not assumed. Step 10 measures DOM count / mount time / scroll INP separately at increasing row counts; the plan's working estimate (8 columns × ~9 nodes/row → budget breaks ~165 rows) is a prediction to verify, not a conclusion to write here as fact.
- Testing: three tiers by risk (Vitest node for resolve-widths, Vitest Browser Mode for width parity/sticky-scroll/th↔td, Playwright for the filter→status-change→persist flow) — matches doc's own real-library citation that jsdom can't be trusted for layout. Step 8's "proof of reusability" claim (the rows/columns contract stays untouched) is currently a negative proof — nothing exercises it with a second consumer. Fix: one browser-mode test mounts DataTable against a non-moderation Row fixture (e.g. a plain {id, name, value} shape), so reuse is demonstrated, not just assumed by omission.

---

## Deviations from the design doc

<!--
Table or list: doc section -> what we did instead -> why. This is the single most
useful section for future-you and for the ADRs, because it's an inventory of every
place judgment overrode the source material.
-->

| Doc section | What Phase 1 does instead | Why |
|---|---|---|
| §12–23 (virtualization, content-measurement sizing, rich-cell sizing, column virtualization, sorting/filtering/selection extensions) | Deferred entirely to Phase 2+ | Can't honestly justify optimizing what hasn't been measured (Step 10 is the gate) |
| §8.1 `ColumnDef` (width/min/max only) | Added `flex` | Doc's own answer to remainder-splitting lives in the deferred §13; `flex` is what shipped libraries converge on instead |
| §9 fixed-row-height (framed by the doc as a virtualization enabler — it exists to make `scrollTop`/`rowHeight`/`viewportHeight`/`overscan` math work) | Not adopted in Phase 1 | No virtualization yet, so there's nothing for it to enable. Rows use natural height; `overflow: wrap` works without constraint, matching §9.1's own note that wrap "fits better in non-virtualized mode." Revisit when virtualization is built (Phase 2) — that's the point doc §9.1 says wrap and fixed-height-for-virtualization become incompatible, and it needs an explicit decision then, not a silent default now |
| §10.1 `rowHeight`/`overscan` | Dropped from Phase 1 props | Doc ties both explicitly to virtualization (§16), which isn't built yet — consistent with not adopting fixed-row-height above |
