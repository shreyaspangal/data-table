import { expect, test } from "vitest";
import { resolveColumnWidths } from "../src/resolve-widths";
import { createColumnHelper } from "../src/types";

// Step 5's own gate: this is a pure function, no DOM involved, so it belongs
// at Tier 1 (node) rather than Tier 2 (browser) — see docs/testing-matrix.md.

type Row = { id: string };
const columnHelper = createColumnHelper<Row>();
const accessor = (row: Row) => row.id;

test("fixed columns take their own width, clamped by their own minWidth/maxWidth", () => {
  const columns = [
    columnHelper.accessor(accessor, {
      key: "tooWide",
      header: "Too wide",
      width: 150,
      minWidth: 50,
      maxWidth: 100,
    }),
    columnHelper.accessor(accessor, {
      key: "tooNarrow",
      header: "Too narrow",
      width: 20,
      minWidth: 50,
    }),
    columnHelper.accessor(accessor, {
      key: "unclamped",
      header: "Unclamped",
      width: 80,
    }),
  ];

  const widths = resolveColumnWidths(columns, 1000);

  expect(widths.tooWide).toBe(100); // clamped down to maxWidth
  expect(widths.tooNarrow).toBe(50); // clamped up to minWidth
  expect(widths.unclamped).toBe(80); // no clamping needed
});

test("flex columns split the remainder proportionally when nothing needs clamping", () => {
  // Same numbers as MUI's own column-dimensions example: a 200px fixed
  // column in a 500px container leaves 300px, split 2:1 between flex:1 and
  // flex:0.5, giving 200/200/100.
  const columns = [
    columnHelper.accessor(accessor, {
      key: "fixed",
      header: "Fixed",
      width: 200,
    }),
    columnHelper.accessor(accessor, {
      key: "flexOne",
      header: "Flex 1",
      flex: 1,
    }),
    columnHelper.accessor(accessor, {
      key: "flexHalf",
      header: "Flex 0.5",
      flex: 0.5,
    }),
  ];

  const widths = resolveColumnWidths(columns, 500);

  expect(widths.fixed).toBe(200);
  expect(widths.flexOne).toBe(200);
  expect(widths.flexHalf).toBe(100);
});

test("a flex column hitting its minWidth forces the remaining flex columns to redistribute what's left", () => {
  // This is the case that pins down the iterative-redistribution bug: A's
  // minWidth (300) is bigger than its 1000px-remainder fair share (100), so
  // it locks at 300 — leaving only 700px for B and C to split by their own
  // ratio (1:8), not the original 1000px. A single-pass (non-iterative)
  // implementation would give B=100 and C=800, summing to 1200 — more width
  // than the 1000px container actually has.
  //
  // B and C get an explicit minWidth: 0 so the default 100px floor (which
  // applies to any flex column that doesn't set its own minWidth) doesn't
  // also kick in here — that's real behavior, but it's a different case
  // than the one this test is pinning down, so it's covered separately.
  const columns = [
    columnHelper.accessor(accessor, {
      key: "a",
      header: "A",
      flex: 1,
      minWidth: 300,
    }),
    columnHelper.accessor(accessor, {
      key: "b",
      header: "B",
      flex: 1,
      minWidth: 0,
    }),
    columnHelper.accessor(accessor, {
      key: "c",
      header: "C",
      flex: 8,
      minWidth: 0,
    }),
  ];

  const widths = resolveColumnWidths(columns, 1000);

  expect(widths.a).toBe(300);
  expect(widths.b).toBeCloseTo((700 * 1) / 9, 5);
  expect(widths.c).toBeCloseTo((700 * 8) / 9, 5);

  // The real regression check: resolved widths must never sum to more than
  // the container actually has.
  const total = (widths.a ?? 0) + (widths.b ?? 0) + (widths.c ?? 0);
  expect(total).toBeCloseTo(1000, 5);
});

test("the default 100px floor can trigger a second round of clamping after the first redistribution", () => {
  // Same shape as above, but B and C have no explicit minWidth, so they
  // fall back to the default 100px floor. A locks at 300 first (pass 1),
  // which drops B's re-split share to ~77.78 — below the 100px default
  // floor — so B locks too (pass 2), leaving only C to take the rest
  // (pass 3). Three passes, not two: this is what "iterative" has to mean
  // in general, not just "run it twice."
  const columns = [
    columnHelper.accessor(accessor, {
      key: "a",
      header: "A",
      flex: 1,
      minWidth: 300,
    }),
    columnHelper.accessor(accessor, { key: "b", header: "B", flex: 1 }),
    columnHelper.accessor(accessor, { key: "c", header: "C", flex: 8 }),
  ];

  const widths = resolveColumnWidths(columns, 1000);

  expect(widths.a).toBe(300);
  expect(widths.b).toBe(100); // default floor, not its ~77.78 fair share
  expect(widths.c).toBe(600); // absorbs everything left after A and B lock

  const total = (widths.a ?? 0) + (widths.b ?? 0) + (widths.c ?? 0);
  expect(total).toBe(1000);
});

test("fixed columns already exceeding the container send flex columns to their own minWidth, or the 100px floor if unset", () => {
  const columns = [
    columnHelper.accessor(accessor, {
      key: "fixed",
      header: "Fixed",
      width: 1000,
    }),
    columnHelper.accessor(accessor, {
      key: "flexWithFloor",
      header: "Flex with floor",
      flex: 1,
      minWidth: 120,
    }),
    columnHelper.accessor(accessor, {
      key: "flexNoFloor",
      header: "Flex, no floor",
      flex: 1,
    }),
  ];

  const widths = resolveColumnWidths(columns, 800);

  expect(widths.fixed).toBe(1000);
  expect(widths.flexWithFloor).toBe(120);
  expect(widths.flexNoFloor).toBe(100); // the default 100px floor
});
