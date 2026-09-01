import { expect, test } from "vitest";
import { defaultFormatter, isValidReactChild } from "../src/helpers";

// Step 6's own gate: the default formatter must never turn a missing value
// into the visible text "null"/"undefined", and must never be trusted with
// something that isn't actually safe to render as-is (like a plain object).

test("isValidReactChild accepts every value React can render directly", () => {
  expect(isValidReactChild(null)).toBe(true);
  expect(isValidReactChild(undefined)).toBe(true);
  expect(isValidReactChild("text")).toBe(true);
  expect(isValidReactChild(0)).toBe(true);
  expect(isValidReactChild(42)).toBe(true);
  expect(isValidReactChild(BigInt(1))).toBe(true);
  expect(isValidReactChild(true)).toBe(true);
  expect(isValidReactChild(false)).toBe(true);
});

test("isValidReactChild rejects values React cannot render directly", () => {
  expect(isValidReactChild({})).toBe(false);
  expect(isValidReactChild([1, 2, 3])).toBe(false);
  expect(isValidReactChild(new Date())).toBe(false);
});

test("defaultFormatter passes safe values through unchanged", () => {
  expect(defaultFormatter(null)).toBe(null);
  expect(defaultFormatter(undefined)).toBe(undefined);
  expect(defaultFormatter("Alice")).toBe("Alice");
  expect(defaultFormatter(0)).toBe(0);
  expect(defaultFormatter(false)).toBe(false);
});

test("defaultFormatter stringifies values React would otherwise throw on", () => {
  // The real bug this guards against: accessor's Value is fully generic, so
  // a column with no renderCell and a non-primitive Value would otherwise
  // crash with "Objects are not valid as a React child."
  expect(defaultFormatter({ id: 1 })).toBe(JSON.stringify({ id: 1 }));
  expect(defaultFormatter([1, 2])).toBe(JSON.stringify([1, 2]));
});
