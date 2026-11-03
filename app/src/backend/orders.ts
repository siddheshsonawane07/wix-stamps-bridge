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

const searchOrders = auth.elevate(orders.searchOrders);
const createFulfillment = auth.elevate(orderFulfillments.createFulfillment);

/** Safety limit so one request can't page forever. 20 pages x 100 orders. */
const MAX_PAGES = 20;

async function searchAll(filter: Record<string, unknown>): Promise<orders.Order[]> {
  const found: orders.Order[] = [];
  let cursor: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await searchOrders({
      filter,
      cursorPaging: cursor ? { limit: 100, cursor } : { limit: 100 },
    });
    found.push(...(res.orders ?? []));
    cursor = res.metadata?.cursors?.next;
    if (!res.metadata?.hasNext || !cursor) break;
  }
  return found;
}

export interface OrdersToShip {
  orders: OrderForExport[];
  /** Order numbers with an item that has no weight, so the store can fix them before downloading. */
  missingWeight: string[];
  /** Paid, unfulfilled orders left out because they have no shipping address (e.g. pickup). */
  noAddress: string[];
}

/** Paid, approved, not yet fulfilled orders placed on or after `since` (an ISO date). */
export async function ordersToShip(since: string): Promise<OrdersToShip> {
  const raw = await searchAll({
    status: "APPROVED",
    paymentStatus: "PAID",
    fulfillmentStatus: "NOT_FULFILLED",
    _createdDate: { $gte: since },
  });
  const result: OrdersToShip = { orders: [], missingWeight: [], noAddress: [] };
  for (const order of raw) {
    const mapped = fromWixOrder(order);
    if (!mapped) {
      if (order.number) result.noAddress.push(order.number);
      continue;
    }
    if (isMissingWeight(mapped)) result.missingWeight.push(mapped.number);
    result.orders.push(mapped);
  }
  // Oldest first, the order they should be packed in.
  result.orders.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return result;
}

async function ordersByNumber(numbers: string[]): Promise<orders.Order[]> {
  const unique = [...new Set(numbers.map(normaliseOrderNumber).filter(Boolean))];
  const found: orders.Order[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    found.push(...(await searchAll({ number: { $in: unique.slice(i, i + 100) } })));
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

/**
 * Marks orders fulfilled with their tracking numbers. Re-reads each order first, so an order that was
 * shipped or cancelled since the upload was checked is skipped rather than fulfilled twice.
 */
export async function fulfil(shipments: ShipmentToFulfil[], defaultCarrier: string): Promise<FulfilResult[]> {
  const byNumber = new Map(
    (await ordersByNumber(shipments.map((s) => s.orderNumber))).map((o) => [o.number ?? "", o]),
  );
  const results: FulfilResult[] = [];
  for (const shipment of shipments) {
    const orderNumber = normaliseOrderNumber(shipment.orderNumber);
    const order = byNumber.get(orderNumber);
    const state = order && stateOfWixOrder(order);
    if (!order || !state) {
      results.push({ orderNumber, outcome: "failed", message: "Order not found." });
      continue;
    }
    if (state.status !== "not_fulfilled") {
      results.push({ orderNumber, outcome: "skipped", message: state.status === "cancelled" ? "Cancelled." : "Already shipped." });
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
      results.push({ orderNumber, outcome: "failed", message: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}
