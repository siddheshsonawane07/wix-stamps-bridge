import { toCsv } from "./csv.js";
import { FIELD_BY_ID } from "./fields.js";
import { checkOrderLayout, LayoutError } from "./layout.js";
import type { ColumnMapping, OrderForExport, OrderLayout } from "./types.js";

function cellValue(column: ColumnMapping, order: OrderForExport): string {
  const source = column.source;
  if (source.kind === "blank") return "";
  if (source.kind === "fixed") return source.value;
  const field = FIELD_BY_ID.get(source.field);
  if (!field) throw new LayoutError(`Column "${column.header}" uses an unknown field: ${source.field}`);
  return field.get(order, source.format);
}

/**
 * Builds the file the store imports at Stamps.com > Orders > Import.
 * One row per order. The header row is the store's sample.csv header row, unchanged.
 */
export function buildOrdersCsv(layout: OrderLayout, orders: OrderForExport[]): string {
  const problems = checkOrderLayout(layout);
  if (problems.length > 0) throw new LayoutError(problems.join(" "));
  const header = layout.columns.map((c) => c.header);
  const rows = orders.map((order) => layout.columns.map((c) => cellValue(c, order)));
  return toCsv([header, ...rows]);
}
