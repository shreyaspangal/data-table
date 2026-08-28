import { expect, test } from "vitest";

// Tier 1 smoke test: proves the node project runs without booting a browser.
// Real content arrives in Step 5 with resolve-widths.
test("node tier runs", () => {
  expect(1 + 1).toBe(2);
});
