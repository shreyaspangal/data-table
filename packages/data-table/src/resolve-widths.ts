import { isFixedWidthColumn, isFlexColumn } from "./helpers";
import type { ColumnDef } from "./types";

const FLEX_MIN_WIDTH_FLOOR = 100; // fallback when a flex column sets no minWidth

function resolveColumnWidths<Row, Value>(
  columns: ColumnDef<Row, Value>[],
  containerWidth: number,
): Record<string, number> {
  const fixedColumns = columns.filter(isFixedWidthColumn);
  const flexColumns = columns.filter(isFlexColumn);

  // Step 1: fixed columns take their own width, clamped by their own min/max.
  const resolved: Record<string, number> = {};
  let totalFixedWidth = 0;

  for (const col of fixedColumns) {
    const clampedWidth = Math.max(
      col.minWidth ?? 0,
      Math.min(col.width, col.maxWidth ?? Infinity),
    );
    resolved[col.key] = clampedWidth;
    totalFixedWidth += clampedWidth;
  }

  let remainder = containerWidth - totalFixedWidth;

  // Step 2: fixed columns alone already fill (or exceed) the container —
  // flex columns fall back to their own floor, table scrolls horizontally.
  if (remainder <= 0) {
    for (const col of flexColumns) {
      resolved[col.key] = col.minWidth ?? FLEX_MIN_WIDTH_FLOOR;
    }
    return resolved;
  }

  // Step 3: split the remainder by flex ratio, re-splitting after every
  // column that hits its min/maxWidth, until nobody new gets clamped.
  let stillGuessing = [...flexColumns];

  while (stillGuessing.length > 0) {
    const totalUnits = stillGuessing.reduce((sum, col) => sum + col.flex, 0);

    // This pass's guesses — thrown away unless nothing gets clamped below.
    const guesses = new Map<string, number>();
    for (const col of stillGuessing) {
      guesses.set(col.key, (col.flex / totalUnits) * remainder);
    }

    // Only columns that actually hit their floor/ceiling get locked in.
    const newlyLocked = stillGuessing.filter((col) => {
      const guess = guesses.get(col.key) as number;
      const clamped = Math.max(
        col.minWidth ?? FLEX_MIN_WIDTH_FLOOR,
        Math.min(guess, col.maxWidth ?? Infinity),
      );
      return clamped !== guess;
    });

    if (newlyLocked.length === 0) {
      // Nobody new got clamped — every remaining guess is final.
      for (const col of stillGuessing) {
        resolved[col.key] = guesses.get(col.key) as number;
      }
      break;
    }

    // Lock in the clamped columns, shrink the pot, and go again
    // whoever's left.
    for (const col of newlyLocked) {
      const guess = guesses.get(col.key) as number;
      const clamped = Math.max(
        col.minWidth ?? FLEX_MIN_WIDTH_FLOOR,
        Math.min(guess, col.maxWidth ?? Infinity),
      );
      resolved[col.key] = clamped;
      remainder -= clamped;
    }
    stillGuessing = stillGuessing.filter((col) => !newlyLocked.includes(col));
  }

  return resolved;
}

export { resolveColumnWidths };
