import { defineConfig } from "vitest/config";

// Vitest's default include (`**/*.{test,spec}.*`) also matches the Playwright
// specs in ./e2e, and Vitest then tries to execute them -- failing with
// "Playwright Test did not expect test() to be called here". The two runners
// must not claim the same files.
//
// The app currently has no Vitest tests of its own; component-level testing
// lives in packages/data-table (Browser Mode) and product flows live in ./e2e
// (Playwright). This config exists to keep that boundary explicit.
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
  },
});
