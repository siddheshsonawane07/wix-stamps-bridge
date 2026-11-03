import { httpClient } from "@wix/essentials";
import type { OrderForExport, OrderState } from "wix-stamps-bridge";
import type { StoreSettings } from "../backend/settings.ts";
import type { FulfilResult, ShipmentToFulfil } from "../backend/orders.ts";

export type { StoreSettings, FulfilResult, ShipmentToFulfil };

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
  ordersToShip: () =>
    call<{ orders: OrderForExport[]; missingWeight: string[]; noAddress: string[] }>("orders-to-ship"),
  orderStates: (numbers: string[]) =>
    call<{ orders: OrderState[] }>("order-states", { method: "POST", body: JSON.stringify({ numbers }) }),
  fulfil: (shipments: ShipmentToFulfil[]) =>
    call<{ results: FulfilResult[] }>("fulfil", { method: "POST", body: JSON.stringify({ shipments }) }),
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

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
