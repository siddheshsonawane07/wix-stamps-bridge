import { auth } from "@wix/essentials";
import { orderFulfillments, orders } from "@wix/ecom";
import {
  fromWixOrder,
  fulfilmentLineItems,
  isMissingWeight,
  normaliseOrderNumber,
  stateOfWixOrder,
  toWixShippingProvider,
  type OrderForExport,
  type OrderState,
} from "wix-stamps-bridge";
import { errorMessage } from "./http.ts";

const searchOrders = auth.elevate(orders.searchOrders);
const createFulfillment = auth.elevate(orderFulfillments.createFulfillment);

/** Safety limit so one request can't page forever: 20 pages x 100 orders. */
const MAX_PAGES = 20;
/** Largest upload handled in one request. The dashboard splits bigger files into batches. */
export const MAX_ORDERS_PER_REQUEST = 1000;

async function searchAll(filter: Record<string, unknown>): Promise<{ orders: orders.Order[]; truncated: boolean }> {
  const found: orders.Order[] = [];
  let cursor: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await searchOrders({
      filter,
      // Oldest first, so if the limit is ever hit it's the newest orders that wait for the next download.
      sort: [{ fieldName: "_createdDate", order: "ASC" }],
      cursorPaging: cursor ? { limit: 100, cursor } : { limit: 100 },
    });
    found.push(...(res.orders ?? []));
    cursor = res.metadata?.cursors?.next;
    if (!res.metadata?.hasNext || !cursor) return { orders: found, truncated: false };
  }
  return { orders: found, truncated: true };
}

export interface OrdersToShip {
  orders: OrderForExport[];
  /** Order numbers with an item that has no weight, so the store can fix them before downloading. */
  missingWeight: string[];
  /** Paid, unfulfilled orders left out because they have no shipping address (e.g. pickup). */
  noAddress: string[];
  /** True when there were more orders than one download holds. The rest appear once these ship. */
  truncated: boolean;
}

/** Paid, approved, not yet fulfilled orders placed at or after `since` (an ISO timestamp). */
export async function ordersToShip(since: string): Promise<OrdersToShip> {
  const { orders: raw, truncated } = await searchAll({
    status: "APPROVED",
    paymentStatus: "PAID",
    fulfillmentStatus: "NOT_FULFILLED",
    _createdDate: { $gte: since },
  });
  const result: OrdersToShip = { orders: [], missingWeight: [], noAddress: [], truncated };
  for (const order of raw) {
    const mapped = fromWixOrder(order);
    if (!mapped) {
      if (order.number) result.noAddress.push(order.number);
      continue;
    }
    if (isMissingWeight(mapped)) result.missingWeight.push(mapped.number);
    result.orders.push(mapped);
  }
  result.orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return result;
}

async function ordersByNumber(numbers: string[]): Promise<orders.Order[]> {
  const unique = [...new Set(numbers.map(normaliseOrderNumber).filter(Boolean))];
  const found: orders.Order[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    found.push(...(await searchAll({ number: { $in: unique.slice(i, i + 100) } })).orders);
  }
  return found;
}

export async function orderStates(numbers: string[]): Promise<OrderState[]> {
  return (await ordersByNumber(numbers)).map(stateOfWixOrder).filter((s): s is OrderState => !!s);
}

export interface ShipmentToFulfil {
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
}

export interface FulfilResult {
  orderNumber: string;
  outcome: "shipped" | "skipped" | "failed";
  message?: string;
}

const SKIP_MESSAGE: Record<Exclude<OrderState["status"], "not_fulfilled">, string> = {
  cancelled: "Cancelled.",
  fulfilled: "Already shipped.",
  not_ready: "Not paid or not approved yet.",
};

/**
 * Marks orders fulfilled with their tracking numbers. Each order is re-read first, so one shipped or
 * cancelled since the upload was checked is skipped. Within a request each order is handled once.
 */
export async function fulfil(shipments: ShipmentToFulfil[], defaultCarrier: string): Promise<FulfilResult[]> {
  const byNumber = new Map(
    (await ordersByNumber(shipments.map((s) => s.orderNumber))).map((o) => [o.number ?? "", o]),
  );
  const handled = new Set<string>();
  const results: FulfilResult[] = [];
  for (const shipment of shipments) {
    const orderNumber = normaliseOrderNumber(shipment.orderNumber);
    if (handled.has(orderNumber)) {
      results.push({ orderNumber, outcome: "skipped", message: "Listed twice. Only the first tracking number was used." });
      continue;
    }
    handled.add(orderNumber);
    const order = byNumber.get(orderNumber);
    const state = order && stateOfWixOrder(order);
    if (!order || !state) {
      results.push({ orderNumber, outcome: "failed", message: "Order not found." });
      continue;
    }
    if (state.status !== "not_fulfilled") {
      results.push({ orderNumber, outcome: "skipped", message: SKIP_MESSAGE[state.status] });
      continue;
    }
    const lineItems = fulfilmentLineItems(order);
    if (lineItems.length === 0) {
      results.push({ orderNumber, outcome: "skipped", message: "Nothing in this order needs shipping." });
      continue;
    }
    try {
      await createFulfillment(state.orderId, {
        lineItems,
        trackingInfo: {
          trackingNumber: shipment.trackingNumber,
          shippingProvider: toWixShippingProvider(shipment.carrier || defaultCarrier),
        },
      });
      results.push({ orderNumber, outcome: "shipped" });
    } catch (error) {
      results.push({ orderNumber, outcome: "failed", message: errorMessage(error) });
    }
  }
  return results;
}
