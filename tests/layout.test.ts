import { describe, expect, it } from "vitest";
import { normaliseHeader } from "../src/core/headers.js";
import {
  checkHistoryLayout,
  checkOrderLayout,
  diffHeaders,
  historyLayoutFromExport,
  layoutFromSample,
  mergeLayouts,
} from "../src/core/layout.js";
import { HISTORY_CSV, SAMPLE_CSV } from "./fixtures.js";

describe("normaliseHeader", () => {
  it("ignores case, spaces and punctuation", () => {
    for (const h of ["Order ID", "order id", "ORDER_ID", "Order-ID", " OrderID "]) {
      expect(normaliseHeader(h)).toBe("orderid");
    }
  });
});

describe("layoutFromSample", () => {
  const layout = layoutFromSample(SAMPLE_CSV);

  it("uses only the header row, word for word and in order", () => {
    expect(layout.columns.map((c) => c.header)).toEqual(SAMPLE_CSV.split("\n")[0].split(","));
  });

  it("matches known headers from the fixed list", () => {
    const byHeader = Object.fromEntries(layout.columns.map((c) => [c.header, c]));
    expect(byHeader["Recipient Name"].source).toEqual({ kind: "field", field: "ship.fullName", format: undefined });
    expect(byHeader["Weight (oz)"].source).toEqual({ kind: "field", field: "order.weight", format: "oz" });
    expect(byHeader["Country"].source).toEqual({ kind: "field", field: "ship.country", format: "code" });
    expect(byHeader["Recipient Name"].matchedBy).toBe("list");
  });

  it("matches 'Order ID (required)', the wording Stamps.com's help uses", () => {
    const col = layout.columns.find((c) => c.header === "Order ID (required)")!;
    expect(col).toMatchObject({ source: { kind: "field", field: "order.number" }, matchedBy: "list" });
    expect(checkOrderLayout(layout)).toEqual([]);
  });

  it("does not guess near misses", () => {
    const near = layoutFromSample("Order Ref,Recipient Full Name");
    expect(near.columns.map((c) => c.matchedBy)).toEqual(["none", "none"]);
    expect(checkOrderLayout(near)).toHaveLength(1);
  });

  it("leaves unknown headers blank", () => {
    for (const h of ["Gift Message", "Cost Code"]) {
      const col = layout.columns.find((c) => c.header === h)!;
      expect(col).toMatchObject({ source: { kind: "blank" }, matchedBy: "none" });
    }
  });

  it("refuses an empty file", () => {
    expect(() => layoutFromSample("\n\n")).toThrow(/empty/);
  });
});

describe("re-uploading a sample", () => {
  it("lists added and removed headers and keeps the store's own choices", () => {
    const saved = layoutFromSample("Order ID,Recipient Name,Gift Message");
    saved.columns[2] = { header: "Gift Message", source: { kind: "fixed", value: "Thanks!" }, matchedBy: "store" };
    const next = layoutFromSample("Order ID,Recipient Name,Gift Message,Insurance");

    expect(diffHeaders(saved, next)).toEqual({ added: ["Insurance"], removed: [] });
    const merged = mergeLayouts(saved, next);
    expect(merged.columns[2].source).toEqual({ kind: "fixed", value: "Thanks!" });
    expect(merged.columns[3].matchedBy).toBe("none");
  });
});

describe("historyLayoutFromExport", () => {
  it("finds Order ID, tracking, carrier and service from the fixed list", () => {
    expect(historyLayoutFromExport(HISTORY_CSV)).toEqual({
      orderId: "Order ID",
      trackingNumber: "Tracking #",
      carrier: "Carrier",
      service: "Mail Class",
    });
  });

  it("names what is missing", () => {
    expect(checkHistoryLayout(historyLayoutFromExport("Date,Carrier\n1,UPS"))).toEqual([
      "Choose which column holds the Order ID.",
      "Choose which column holds the tracking number.",
    ]);
  });
});
