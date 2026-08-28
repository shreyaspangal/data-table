import { expect, test } from "@playwright/test";

// Deliberately thin for now: it proves the production build boots, serves, and
// renders without a client-side exception. That is a real regression gate --
// an RSC boundary mistake (functions crossing server -> client) surfaces here
// and nowhere else in the pipeline.
//
// Real queue flows (filter via URL -> change status -> reload -> persisted)
// arrive with Step 8.
test("production build serves the app without console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toBeVisible();
  expect(errors).toEqual([]);
});
