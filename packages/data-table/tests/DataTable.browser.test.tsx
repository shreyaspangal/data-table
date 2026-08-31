import { expect, test } from "vitest";
import { render } from "vitest-browser-react";
import { createColumnHelper, DataTable } from "../src";

// Step 3's own gate: "header↔cell association, accessible name from
// caption/aria-label" (see the plan). Both are real browser accessibility-tree
// behavior, not something a pure function can assert — hence tier 2, not tier 1.

type Row = { id: string; name: string; count: number };

const rows: Row[] = [
  { id: "1", name: "Alice", count: 3 },
  { id: "2", name: "Bob", count: 5 },
];

const columnHelper = createColumnHelper<Row>();

const columns = [
  columnHelper.accessor((row) => row.name, {
    key: "name",
    header: "Name",
    width: 200,
  }),
  columnHelper.accessor((row) => row.count, {
    key: "count",
    header: "Count",
    width: 100,
  }),
];

test("associates each header with its column via scope=col, and each cell renders in the right column", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Test table"
    />,
  );

  const nameHeader = screen
    .getByRole("columnheader", { name: "Name" })
    .element();
  const countHeader = screen
    .getByRole("columnheader", { name: "Count" })
    .element();
  expect(nameHeader.getAttribute("scope")).toBe("col");
  expect(countHeader.getAttribute("scope")).toBe("col");

  // Native <table> + scope="col" is what gives the browser the header/cell
  // association for free — verified here by asking the accessibility tree for
  // cells by role, rather than by any custom logic in DataTable itself.
  const cells = screen.getByRole("cell").all();
  expect(cells.map((cell) => cell.element().textContent)).toEqual([
    "Alice",
    "3",
    "Bob",
    "5",
  ]);
});

test("caption becomes the table's accessible name", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Test table"
    />,
  );

  expect(
    screen.getByRole("table", { name: "Test table" }).element(),
  ).toBeTruthy();
});

test("caption wins as the accessible name even when ariaLabel is also provided", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      caption="Test table"
      ariaLabel="Should be ignored"
    />,
  );

  expect(
    screen.getByRole("table", { name: "Test table" }).element(),
  ).toBeTruthy();
  expect(
    screen.getByRole("table", { name: "Should be ignored" }).elements(),
  ).toHaveLength(0);
});

test("ariaLabel becomes the accessible name when no caption is given", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      ariaLabel="Labeled table"
    />,
  );

  expect(
    screen.getByRole("table", { name: "Labeled table" }).element(),
  ).toBeTruthy();
});

test("ariaLabelledBy becomes the accessible name when no caption is given", async () => {
  const screen = await render(
    <div>
      <h2 id="heading">Referenced heading</h2>
      <DataTable
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        ariaLabelledBy="heading"
      />
    </div>,
  );

  expect(
    screen.getByRole("table", { name: "Referenced heading" }).element(),
  ).toBeTruthy();
});

test("shows loading state instead of rows, spanning every column", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      loading
      caption="Test table"
    />,
  );

  const loadingCell = screen.getByText("Loading...").element();
  expect(loadingCell.getAttribute("colspan")).toBe("2");
  expect(screen.getByRole("cell", { name: "Alice" }).elements()).toHaveLength(
    0,
  );
});

test("shows errorState instead of rows when errorState is set and not loading", async () => {
  const screen = await render(
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      errorState="Something went wrong"
      caption="Test table"
    />,
  );

  expect(screen.getByText("Something went wrong").element()).toBeTruthy();
  expect(screen.getByRole("cell", { name: "Alice" }).elements()).toHaveLength(
    0,
  );
});

test("shows emptyState when there are no rows, not loading, and no error", async () => {
  const screen = await render(
    <DataTable
      rows={[]}
      columns={columns}
      getRowId={(row) => row.id}
      emptyState="Nothing here"
      caption="Test table"
    />,
  );

  expect(screen.getByText("Nothing here").element()).toBeTruthy();
});

// Step 4's own gate: scroll programmatically and assert the header stays
// pinned. Impossible in jsdom (no layout engine, position: sticky is a no-op
// there) — this is exactly why this project has no jsdom tier.
test("keeps the header pinned to the scroll container's top while the body scrolls", async () => {
  const manyRows: Row[] = Array.from({ length: 50 }, (_, i) => ({
    id: String(i),
    name: `Row ${i}`,
    count: i,
  }));

  const screen = await render(
    <DataTable
      rows={manyRows}
      columns={columns}
      getRowId={(row) => row.id}
      ariaLabel="Test table"
      height={200}
    />,
  );

  const table = screen.getByRole("table").element();
  const scrollContainer = table.parentElement as HTMLElement;
  const header = screen.getByRole("columnheader", { name: "Name" }).element();
  const firstDataCell = screen.getByRole("cell", { name: "Row 0" }).element();

  // Sanity check: the container is actually shorter than its content, so a
  // scroll can meaningfully happen at all.
  expect(scrollContainer.scrollHeight).toBeGreaterThan(
    scrollContainer.clientHeight,
  );

  // A couple of pixels' slack accounts for the browser's default table
  // border-spacing — not a claim about pixel-perfect alignment.
  const isFlushWithContainerTop = (top: number, containerTop: number) =>
    Math.abs(top - containerTop) <= 5;

  const containerTop = scrollContainer.getBoundingClientRect().top;
  // No caption/anything else above the header here, so it starts flush
  // against the container's top edge.
  expect(
    isFlushWithContainerTop(header.getBoundingClientRect().top, containerTop),
  ).toBe(true);
  const firstDataCellTopBefore = firstDataCell.getBoundingClientRect().top;

  scrollContainer.scrollTop = 300;

  // The scroll actually happened, and moved real content out of its
  // original position...
  expect(scrollContainer.scrollTop).toBeGreaterThan(0);
  expect(firstDataCell.getBoundingClientRect().top).not.toBeCloseTo(
    firstDataCellTopBefore,
    0,
  );
  // ...but the header stayed exactly where it was: this is what "sticky"
  // means, as opposed to just "the container happens to be short."
  expect(
    isFlushWithContainerTop(header.getBoundingClientRect().top, containerTop),
  ).toBe(true);
});
