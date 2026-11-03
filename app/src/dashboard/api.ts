import { httpClient } from "@wix/essentials";
import type { OrderState } from "wix-stamps-bridge";
import type { StoreSettings } from "../backend/settings.ts";
import type { FulfilResult, OrdersToShip, ShipmentToFulfil } from "../backend/orders.ts";

export type { StoreSettings, FulfilResult, OrdersToShip, ShipmentToFulfil };

/** Matches the server's per-request limit (MAX_ORDERS_PER_REQUEST). Bigger uploads go in batches. */
const BATCH = 500;

function batches<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += BATCH) out.push(list.slice(i, i + BATCH));
  return out;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const base = new URL(import.meta.url).origin;
  const res = await httpClient.fetchWithAuth(`${base}/api/${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`);
  return body as T;
}

export const api = {
  getSettings: () => call<StoreSettings>("settings"),
  saveSettings: (settings: StoreSettings) =>
    call<StoreSettings>("settings", { method: "POST", body: JSON.stringify(settings) }),
  ordersToShip: () => call<OrdersToShip>("orders-to-ship"),
  /** Looks up each order number once, in batches. */
  orderStates: async (numbers: string[]): Promise<OrderState[]> => {
    const found: OrderState[] = [];
    for (const batch of batches([...new Set(numbers)])) {
      const res = await call<{ orders: OrderState[] }>("order-states", { method: "POST", body: JSON.stringify({ numbers: batch }) });
      found.push(...res.orders);
    }
    return found;
  },
  /** Sends shipments in batches. Stops at the first failed request and keeps what already shipped. */
  fulfil: async (shipments: ShipmentToFulfil[]): Promise<FulfilResult[]> => {
    const results: FulfilResult[] = [];
    for (const batch of batches(shipments)) {
      const res = await call<{ results: FulfilResult[] }>("fulfil", { method: "POST", body: JSON.stringify({ shipments: batch }) });
      results.push(...res.results);
    }
    return results;
  },
};

/** Saves text as a file on the viewer's computer. */
export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Today's date in the viewer's own time zone, as YYYY-MM-DD. */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Midnight at the start of a YYYY-MM-DD date in the viewer's time zone, as a UTC timestamp. */
export function startOfLocalDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toISOString();
}
