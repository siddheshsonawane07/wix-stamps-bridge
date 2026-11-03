import { parseCsv } from "./csv.js";
import { lookupHistoryHeader, lookupOrderHeader } from "./headers.js";
import type { ColumnMapping, HistoryLayout, OrderLayout } from "./types.js";

export class LayoutError extends Error {}

/**
 * Reads the header row of a store's Stamps.com sample.csv and matches each column
 * from the fixed list. Only row 1 is used: the sample's example and notes rows are ignored.
 * Headers keep their exact spelling and order, as Stamps.com requires.
 */
export function layoutFromSample(sampleCsv: string): OrderLayout {
  const rows = parseCsv(sampleCsv);
  if (rows.length === 0) throw new LayoutError("The sample file is empty.");
  const headers = rows[0];
  const seen = new Set<string>();
  const columns: ColumnMapping[] = headers.map((header) => {
    const known = lookupOrderHeader(header);
    if (!known || seen.has(known.field + (known.format ?? ""))) {
      return { header, source: { kind: "blank" }, matchedBy: "none" };
    }
    seen.add(known.field + (known.format ?? ""));
    return { header, source: { kind: "field", field: known.field, format: known.format }, matchedBy: "list" };
  });
  return { columns };
}

/** The column that carries the Wix order number, which Stamps.com needs as Order ID. */
export function orderIdColumn(layout: OrderLayout): ColumnMapping | undefined {
  return layout.columns.find((c) => c.source.kind === "field" && c.source.field === "order.number");
}

/** Problems that stop a download. Empty when the layout is usable. */
export function checkOrderLayout(layout: OrderLayout): string[] {
  const problems: string[] = [];
  if (layout.columns.length === 0) problems.push("No columns. Upload your Stamps.com sample.csv first.");
  if (!orderIdColumn(layout)) problems.push("No column is filled with the Wix order number (Stamps.com's Order ID).");
  return problems;
}

/** Compares a newly uploaded sample with the saved layout, so the store sees what changed before saving. */
export function diffHeaders(saved: OrderLayout, next: OrderLayout): { added: string[]; removed: string[] } {
  const before = new Set(saved.columns.map((c) => c.header));
  const after = new Set(next.columns.map((c) => c.header));
  return {
    added: [...after].filter((h) => !before.has(h)),
    removed: [...before].filter((h) => !after.has(h)),
  };
}

/**
 * Applies a new sample but keeps the store's earlier choices for headers that still exist.
 */
export function mergeLayouts(saved: OrderLayout, next: OrderLayout): OrderLayout {
  const previous = new Map(saved.columns.map((c) => [c.header, c]));
  return {
    columns: next.columns.map((c) => {
      const old = previous.get(c.header);
      return old && old.matchedBy === "store" ? old : c;
    }),
  };
}

/** Finds the needed columns in a store's Stamps.com print-history export, from the fixed list. */
export function historyLayoutFromExport(exportCsv: string): HistoryLayout {
  const rows = parseCsv(exportCsv);
  if (rows.length === 0) throw new LayoutError("The history file is empty.");
  const layout: HistoryLayout = {};
  for (const header of rows[0]) {
    const field = lookupHistoryHeader(header);
    if (field && layout[field] === undefined) layout[field] = header;
  }
  return layout;
}

export function checkHistoryLayout(layout: HistoryLayout): string[] {
  const problems: string[] = [];
  if (!layout.orderId) problems.push("Choose which column holds the Order ID.");
  if (!layout.trackingNumber) problems.push("Choose which column holds the tracking number.");
  return problems;
}
