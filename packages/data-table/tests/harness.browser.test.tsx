import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

// Tier 2 smoke test, and a demonstration of why this tier exists at all.
//
// This asserts a *computed* width produced by the browser's layout engine from
// a <colgroup> plus table-layout: fixed — the exact mechanism the shared width
// contract relies on (Step 5). In jsdom every one of these values would be 0,
// because jsdom does not lay anything out. That is the whole reason this
// project has no jsdom tier.
test("browser tier has a real layout engine", async () => {
  const screen = await render(
    <table style={{ tableLayout: "fixed", width: "400px" }}>
      <colgroup>
        <col style={{ width: "120px" }} />
        <col style={{ width: "280px" }} />
      </colgroup>
      <tbody>
        <tr>
          <td data-testid="narrow">narrow</td>
          <td data-testid="wide">wide</td>
        </tr>
      </tbody>
    </table>,
  );

  const narrow = screen.getByTestId("narrow").element();
  const wide = screen.getByTestId("wide").element();

  expect(narrow.getBoundingClientRect().width).toBe(120);
  expect(wide.getBoundingClientRect().width).toBe(280);
});
