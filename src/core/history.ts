import { parseCsv } from "./csv.js";
import { checkHistoryLayout, LayoutError } from "./layout.js";
import type { HistoryLayout, OrderState } from "./types.js";

export interface ShipmentRow {
  /** 1-based line number in the uploaded file, for messages. */
  line: number;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  service: string;
}

/** Reads a Stamps.com print-history export using the store's saved history layout. */
export function readShipments(exportCsv: string, layout: HistoryLayout): ShipmentRow[] {
  const problems = checkHistoryLayout(layout);
  if (problems.length > 0) throw new LayoutError(problems.join(" "));
  const [header, ...rows] = parseCsv(exportCsv);
  if (!header) throw new LayoutError("The history file is empty.");

  const index = (name?: string) => (name === undefined ? -1 : header.indexOf(name));
  const col = {
    orderId: index(layout.orderId),
    trackingNumber: index(layout.trackingNumber),
    carrier: index(layout.carrier),
    service: index(layout.service),
  };
  const missing = (["orderId", "trackingNumber"] as const).filter((k) => col[k] === -1).map((k) => layout[k]);
  if (missing.length > 0) {
    throw new LayoutError(`This file has no "${missing.join('" or "')}" column. Check the history layout in Setup.`);
  }

  const at = (row: string[], i: number) => (i === -1 ? "" : (row[i] ?? "").trim());
  return rows.map((row, i) => ({
    line: i + 2,
    orderNumber: normaliseOrderNumber(at(row, col.orderId)),
    trackingNumber: at(row, col.trackingNumber),
    carrier: at(row, col.carrier),
    service: at(row, col.service),
  }));
}

/** "#10342", " 10342 " and "10342" are the same order. */
export function normaliseOrderNumber(value: string): string {
  return value.trim().replace(/^#/, "").trim();
}

export type PlanStatus =
  | "ready"
  | "already_shipped"
  | "cancelled"
  | "not_ready"
  | "not_matched"
  | "no_tracking"
  | "extra_label";

export interface PlannedShipment extends ShipmentRow {
  status: PlanStatus;
  /** The Wix order id, when the row matched an order. */
  orderId?: string;
}

/**
 * Decides what to do with each row of an upload. Nothing is written here: the Upload tab shows
 * this list, and only rows marked "ready" are fulfilled when the store clicks Confirm.
 * Safe to repeat: orders already fulfilled are skipped.
 */
export function planFulfilments(rows: ShipmentRow[], orders: OrderState[]): PlannedShipment[] {
  const byNumber = new Map(orders.map((o) => [normaliseOrderNumber(o.number), o]));
  const taken = new Set<string>();
  return rows.map((row) => {
    if (!row.trackingNumber) return { ...row, status: "no_tracking" };
    const order = row.orderNumber ? byNumber.get(row.orderNumber) : undefined;
    if (!order) return { ...row, status: "not_matched" };
    const base = { ...row, orderId: order.orderId };
    if (order.status === "cancelled") return { ...base, status: "cancelled" };
    if (order.status === "fulfilled") return { ...base, status: "already_shipped" };
    if (order.status === "not_ready") return { ...base, status: "not_ready" };
    if (taken.has(order.orderId)) return { ...base, status: "extra_label" };
    taken.add(order.orderId);
    return { ...base, status: "ready" };
  });
}

/**
 * Maps a Stamps.com carrier name to a Wix shipping provider id, so Wix can build the tracking link.
 * Unknown carriers are passed through as written.
 */
export function toWixShippingProvider(carrier: string): string {
  const c = carrier.toLowerCase();
  // GlobalPost has its own tracking, so a USPS or UPS link would be wrong.
  if (c.includes("globalpost")) return carrier;
  if (c.includes("usps") || c.includes("postal")) return "usps";
  if (c.includes("ups")) return "ups";
  if (c.includes("fedex")) return "fedex";
  if (c.includes("dhl")) return "dhl";
  return carrier;
}
