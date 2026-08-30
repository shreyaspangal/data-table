# TypeScript gotchas

Language-level traps hit while designing `packages/data-table/src/types.ts`
(Step 2). Unlike `docs/toolchain-gotchas.md` (tools that report success while
doing nothing), these are cases where the *type checker behaved correctly*
but not the way intuition suggested — each one caught by `tsc --noEmit`
failing, not by inspection.

## `keyof`, and anything built on it, collapses a union to its common keys

`keyof (A | B)` is the **intersection** of `keyof A` and `keyof B`, not the
union. A key that exists in only one branch of a union type is invisible to
`keyof` on the whole union.

This matters because `Omit<T, K>` and `Pick<T, K>` are both defined in terms
of `keyof T`. Given

```ts
type ColumnSizing =
  | { width: number; minWidth?: number; maxWidth?: number }
  | { flex: number; minWidth?: number; maxWidth?: number };
```

`keyof ColumnSizing` is only `"minWidth" | "maxWidth"` — `width` and `flex`
each live in one branch, so neither counts. Running `Omit<ColumnDef<Row,
Value>, "accessor">` (where `ColumnDef` includes `ColumnSizing`) silently
dropped *both* `width` and `flex` from the result — not because they were
omitted, but because `Omit` never knew they existed.

**Fix:** never run `Omit`/`Pick` on a type that includes a discriminated
union directly. Split the non-union fields into their own type, run the
utility type on that alone, then intersect the union back in afterward,
untouched:

```ts
type ColumnCommon<Row, Value> = { key: string; header: ...; /* no union */ };
type ColumnDef<Row, Value = unknown> = ColumnCommon<Row, Value> & ColumnSizing;

// in createColumnHelper:
config: Omit<ColumnCommon<Row, Value>, "accessor"> & ColumnSizing
```

## A self-referential generic type must re-pass its own type parameters

Inside the definition of a generic type, referencing that same type without
supplying every type argument does not mean "stay generic" — it falls back
to whatever default you declared.

```ts
type ColumnDef<Row, Value = unknown> = {
  header: ReactNode | ((column: ColumnDef<Row>) => ReactNode); // BUG
  // ...
};
```

`ColumnDef<Row>` inside `ColumnDef`'s own body always resolves to
`ColumnDef<Row, unknown>`, regardless of what `Value` the *outer* instance
was parameterized with. A `ColumnDef<Report, Severity>` column's `header`
callback would receive `column: ColumnDef<Report, unknown>` — the real
`Severity` type is silently lost at exactly the one place that referenced it
recursively.

**Fix:** pass the same type parameter through explicitly —
`ColumnDef<Row, Value>`, not `ColumnDef<Row>`. Every generic reference,
including self-references, is its own independent instantiation; there is no
implicit inheritance from the enclosing scope.

## Verify, don't eyeball

Both of the above type-checked as "looks right" on a read-through and only
surfaced as real errors under `npx tsc --noEmit -p packages/data-table/tsconfig.json`.
Generic/union TypeScript is unreliable to review by inspection alone — compile
it.
