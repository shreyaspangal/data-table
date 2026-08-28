import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// Two of the three testing tiers live here (the third, Playwright e2e, lives in
// apps/web because it drives the running product).
//
//   node    → pure functions. No DOM, no browser startup. Milliseconds.
//   browser → anything needing real layout: column widths, sticky headers,
//             scroll position, computed styles. jsdom has no layout engine,
//             so those assertions are impossible there.
//
// See docs/testing-matrix.md for which risk belongs at which tier.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.node.test.ts"],
        },
      },
      {
        test: {
          name: "browser",
          include: ["tests/**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
