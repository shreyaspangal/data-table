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

### Non-functional

### Out of scope (Phase 1)

---

## Architecture / High-level design (~20%)

<!--
The component map: page.tsx (server) -> columns.tsx (client) -> DataTable (client).
What crosses the RSC boundary and what doesn't, and why (this is ADR-003 material —
state the claim here, defend it there). Where does each piece of state live
(this previews Step 2.5's state-architecture doc — don't duplicate it, just name
the boundary).
-->

---

## Data model (~10%)

<!--
Row shape vs ColumnDef shape — why are these different types? What does the table
package need to know about a Row that the app-specific renderer doesn't? Keep this
free of moderation-domain vocabulary in the package's own model (see CLAUDE.md
conventions) — but the app's row shape can and should be domain-specific.
-->

---

## Interface (API) (~20%)

<!--
The DataTable's public props from the consumer's point of view (not the internal
implementation — that's Step 2's job). What does someone integrating this table need
to pass in, and what do they get out (controlled callbacks, etc.)? This is where you
justify "controlled-only" from the consumer's perspective, not just internally.
-->

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

---

## Deviations from the design doc

<!--
Table or list: doc section -> what we did instead -> why. This is the single most
useful section for future-you and for the ADRs, because it's an inventory of every
place judgment overrode the source material.
-->
