import { describe, expect, it } from "vitest";
import { parseCsv } from "../src/core/csv.js";
import { buildOrdersCsv } from "../src/core/export.js";
import { isMissingWeight } from "../src/core/fields.js";
import { layoutFromSample } from "../src/core/layout.js";
import type { OrderLayout } from "../src/core/types.js";
import { ORDER, SAMPLE_CSV } from "./fixtures.js";

function storeLayout(): OrderLayout {
  const layout = layoutFromSample(SAMPLE_CSV);
  // What a store would set by hand in Setup.
  for (const c of layout.columns) {
    if (c.header === "Cost Code") {
      c.source = { kind: "fixed", value: "SHOP" };
      c.matchedBy = "store";
    }
  }
  return layout;
}

describe("buildOrdersCsv", () => {
  it("writes the sample's header row unchanged, then one row per order", () => {
    const rows = parseCsv(buildOrdersCsv(storeLayout(), [ORDER]));
    expect(rows[0]).toEqual(SAMPLE_CSV.split("\n")[0].split(","));
    const row = Object.fromEntries(rows[0].map((h, i) => [h, rows[1][i]]));

    expect(row["Order ID (required)"]).toBe("10342");
    expect(row["Order Date"]).toBe("2026-11-14");
    expect(row["Address 1"]).toBe("10 Example Ave, Apt 4");
    expect(row["Country"]).toBe("US");
    expect(row["Item SKU"]).toBe("TEE-M; MUG-1");
    expect(row["Quantity"]).toBe("3");
    expect(row["Weight (oz)"]).toBe("16"); // (2 x 0.25 + 0.5) lb = 1 lb = 16 oz
    expect(row["Gift Message"]).toBe("");
    expect(row["Cost Code"]).toBe("SHOP");
  });

  it("refuses to build a file without an Order ID column", () => {
    expect(() => buildOrdersCsv(layoutFromSample("Recipient Name,City"), [ORDER])).toThrow(/order number/);
  });

  it("gives country names when the store picks that format", () => {
    const layout: OrderLayout = {
      columns: [
        { header: "Order ID", source: { kind: "field", field: "order.number" }, matchedBy: "list" },
        { header: "Country", source: { kind: "field", field: "ship.country", format: "name" }, matchedBy: "store" },
      ],
    };
    const rows = parseCsv(buildOrdersCsv(layout, [{ ...ORDER, recipient: { ...ORDER.recipient, countryCode: "GB" } }]));
    expect(rows[1]).toEqual(["10342", "United Kingdom"]);
  });

  it("leaves weight blank, and warns, when an item has no weight", () => {
    const order = { ...ORDER, items: [{ ...ORDER.items[0], weight: undefined }] };
    expect(isMissingWeight(order)).toBe(true);
    const rows = parseCsv(buildOrdersCsv(storeLayout(), [order]));
    expect(rows[1][rows[0].indexOf("Weight (oz)")]).toBe("");
  });
});
