// Example data only. Shapes match the real endpoints in src/pages/api/.
import type { OrderForExport, OrderState } from "wix-stamps-bridge";
import { layoutFromSample, historyLayoutFromExport } from "wix-stamps-bridge";

export type StoreSettings = import("../src/backend/settings.ts").StoreSettings;
export type FulfilResult = import("../src/backend/orders.ts").FulfilResult;
export type OrdersToShip = import("../src/backend/orders.ts").OrdersToShip;
export type ShipmentToFulfil = import("../src/backend/orders.ts").ShipmentToFulfil;

export const SAMPLE = [
  "Order ID (required),Order Date,Recipient Name,Company,Address 1,Address 2,City,State,Postal Code,Country,Email,Phone,Item SKU,Quantity,Weight (oz),Gift Message,Cost Code",
  "1001,2026-01-01,Jane Doe,,1 Main St,,Springfield,IL,62701,US,jane@example.com,555-0100,ABC-1,1,8,,",
].join("\n");
export const HISTORY = [
  "Date Printed,Order ID,Recipient,Carrier,Mail Class,Tracking #,Amount",
  "2026-11-04,10342,A. Thompson,UPS,UPS Ground,1Z999AA10123456784,12.40",
  "2026-11-04,10343,R. Clarke,UPS,UPS Worldwide Saver,1Z999AA10123456791,24.10",
  "2026-11-04,10344,M. Joseph,UPS,UPS Ground,1Z999AA10123456802,11.90",
  "2026-11-04,10339,K. Baptiste,UPS,UPS Ground,1Z999AA10123456700,12.40",
].join("\n");

const order = (number: string, day: string, name: string, city: string, region: string, country: string, qty: number): OrderForExport => ({
  number, createdAt: `2026-11-${day}T10:00:00.000Z`,
  recipient: { fullName: name, address1: "10 Example Street", city, region, postalCode: "00000", countryCode: country },
  items: [{ sku: "TEE-M", name: "T-shirt", quantity: qty, unitPrice: 20, weight: 0.4 }],
  weightUnit: "lb", total: 20 * qty, currency: "USD",
});

const layout = layoutFromSample(SAMPLE);
for (const c of layout.columns) if (c.header === "Cost Code") { c.source = { kind: "fixed", value: "SHOP" }; c.matchedBy = "store"; }

const view = new URLSearchParams(location.search).get("view") ?? "";
const ready = view !== "setup-empty";

export const api = {
  getSettings: async (): Promise<StoreSettings> =>
    ready ? { orderLayout: layout, historyLayout: historyLayoutFromExport(HISTORY), startDate: "2026-11-04", startAt: "2026-11-04T00:00:00.000Z", defaultCarrier: "UPS" } : {},
  saveSettings: async (s: StoreSettings) => s,
  ordersToShip: async (): Promise<OrdersToShip> => ({
    orders: [
      order("10342", "04", "A. Thompson", "Brooklyn", "NY", "US", 2),
      order("10343", "04", "R. Clarke", "Leeds", "", "GB", 1),
      order("10344", "04", "M. Joseph", "Miami", "FL", "US", 3),
      order("10345", "04", "K. Baptiste", "Toronto", "ON", "CA", 1),
    ],
    missingWeight: [], noAddress: [], truncated: false,
  }),
  orderStates: async (numbers: string[]): Promise<OrderState[]> =>
    numbers.map((n) => ({ orderId: `id-${n}`, number: n, status: n === "10339" ? "fulfilled" : "not_fulfilled" })),
  fulfil: async (shipments: ShipmentToFulfil[]): Promise<FulfilResult[]> =>
    shipments.map((s) => ({ orderNumber: s.orderNumber, outcome: "shipped" as const })),
};
export function downloadText() {}
export function today() { return "2026-11-04"; }
export function startOfLocalDay(d: string) { return `${d}T00:00:00.000Z`; }
