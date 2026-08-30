# ADR-011: `packages/data-table` styles with CSS Modules, not Tailwind

- **Status:** Accepted
- **Date:** 2026-08-30
- **Step:** 3 (surfaced while writing `DataTable.tsx`'s markup, but the
  decision itself predates Step 0 — recorded in the plan's stack table
  without its reasoning until now)
- **Related:** ADR-008 (package boundary) — same underlying instinct
  (the package must not assume anything about its consumer) applied to
  styling instead of dependency direction.

## Context

`apps/web` uses Tailwind v4 + shadcn/ui. `packages/data-table`'s own stated
requirement (RADIO doc, Requirements section; design doc §1) is to be generic
enough to reuse across multiple product surfaces — surfaces this project will
never build, but the constraint is still real: nothing about the package's
implementation should assume a specific consumer.

The question: should `DataTable.tsx`'s markup use Tailwind utility classes
(`className="flex items-center px-2"`), matching the app, or something else?

## Decision

CSS Modules (`DataTable.module.css`) plus CSS custom properties for the
theming surface (colors, spacing) a consumer might want to override.

## Why: Tailwind classes are inert without the consumer's build cooperating

Tailwind is not a runtime library — it is a build-time scanner. It reads
source files for class-name strings and generates only the CSS those strings
need. If the package's compiled output contained
`className="flex items-center px-2"`, that string produces real CSS **only
if whatever build tool the consumer uses is configured to scan inside
`node_modules/@moderation/data-table`** for it. Most Tailwind `content`
globs do not include `node_modules` by default. Ship Tailwind classes from
a library and the default outcome, for any consumer who hasn't specifically
special-cased the package, is inert class-name strings with zero CSS behind
them — a silently broken component, not a build error.

This is exactly why libraries meant to be consumed broadly regardless of the
host app's styling choice — Radix Primitives, React Aria, Ariakit — ship
their own CSS (Modules, or plain CSS + custom properties) rather than
Tailwind utility classes baked into their markup. Their entire value
proposition is "works no matter what the consumer's styling setup looks
like," and Tailwind-in-the-library breaks that for any consumer not running
an identically-configured Tailwind build.

CSS Modules solve this because they compile to real, scoped CSS at the
**package's own build time** (via `tsdown`), shipping as a working artifact
in the published bundle — no dependency on the consumer's tooling at all.
Custom properties (`--dt-*`-style variables) are the escape hatch for
theming: any consumer, Tailwind or not, can override colors/spacing by
setting CSS variables, the same mechanism Radix/Base UI expose.

## Options considered

### Rejected: Tailwind utility classes in the package's JSX

Fastest to write, and consistent with the app's own styling. Rejected
because it makes the package's behavior depend on the consumer's build
configuration in a way that fails silently (inert classes, not a compile
error) for any consumer that isn't `apps/web` itself — directly
contradicting the "generic enough to reuse" requirement this package exists
to satisfy.

### Rejected: pre-compiled Tailwind output shipped alongside the package

Run Tailwind at the package's own build time and ship the resulting
stylesheet, sidestepping the consumer-build-cooperation problem. Rejected as
pure overhead: once you're shipping a compiled stylesheet either way, there
is no benefit left to authoring the source in Tailwind's utility syntax —
CSS Modules give the same "compiled, working CSS ships with the package"
outcome without a second build tool bolted onto `packages/data-table` purely
to immediately throw away Tailwind's actual selling point (utility classes
co-located with markup, scanned live in the consuming app).

### Rejected: inline styles only, no stylesheet at all

Zero build-time dependency of any kind. Rejected because categorical,
reusable values (`align: 'start' | 'center' | 'end'`, `overflow: 'truncate'
| 'clip' | 'wrap'`) are exactly what CSS classes are for — inline styles
would mean re-deriving the same `text-align`/`overflow`/`white-space`/
`text-overflow` combinations at every call site instead of naming them once.
(Per-instance numeric values — `width`, `minWidth`, `maxWidth` — remain
inline `style`, correctly; those aren't categorical and don't belong in a
class.)

## Consequences

- `apps/web` keeps Tailwind + shadcn for the product surface — the
  "must work for any consumer" constraint only applies to the package.
- Any future second consumer of `packages/data-table` gets working styles
  regardless of its own styling stack, without special configuration.
- Theming (if ever needed beyond the fixed `align`/`overflow` enums) goes
  through CSS custom properties, not a Tailwind config extension.
