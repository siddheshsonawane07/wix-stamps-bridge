import type { OrderForExport, WeightUnit } from "./types.js";

/**
 * Every Wix value a Stamps.com column can be filled with.
 * `formats` lists the choices a store can pick for that field; the first one is the default.
 */
export interface WixField {
  id: string;
  label: string;
  formats?: string[];
  get: (order: OrderForExport, format?: string) => string;
}

const GRAMS: Record<WeightUnit, number> = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  return (value * GRAMS[from]) / GRAMS[to];
}

function round(value: number, places = 2): string {
  return String(Math.round(value * 10 ** places) / 10 ** places);
}

function totalWeight(order: OrderForExport): number | undefined {
  if (order.items.some((i) => i.weight === undefined)) return undefined;
  return order.items.reduce((sum, i) => sum + (i.weight ?? 0) * i.quantity, 0);
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export const WIX_FIELDS: WixField[] = [
  { id: "order.number", label: "Wix order number", get: (o) => o.number },
  {
    id: "order.date",
    label: "Order date",
    formats: ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"],
    get: (o, f = "YYYY-MM-DD") => {
      const [y, m, d] = o.createdAt.slice(0, 10).split("-");
      if (f === "MM/DD/YYYY") return `${m}/${d}/${y}`;
      if (f === "DD/MM/YYYY") return `${d}/${m}/${y}`;
      return `${y}-${m}-${d}`;
    },
  },
  { id: "ship.fullName", label: "Shipping: full name", get: (o) => o.recipient.fullName },
  { id: "ship.company", label: "Shipping: company", get: (o) => o.recipient.company ?? "" },
  { id: "ship.address1", label: "Shipping: address line 1", get: (o) => o.recipient.address1 },
  { id: "ship.address2", label: "Shipping: address line 2", get: (o) => o.recipient.address2 ?? "" },
  { id: "ship.city", label: "Shipping: city", get: (o) => o.recipient.city },
  { id: "ship.region", label: "Shipping: state / county", get: (o) => o.recipient.region ?? "" },
  { id: "ship.postalCode", label: "Shipping: postcode / ZIP", get: (o) => o.recipient.postalCode },
  {
    id: "ship.country",
    label: "Shipping: country",
    formats: ["code", "name"],
    get: (o, f = "code") =>
      f === "name" ? regionNames.of(o.recipient.countryCode) ?? o.recipient.countryCode : o.recipient.countryCode,
  },
  { id: "ship.phone", label: "Shipping: phone", get: (o) => o.recipient.phone ?? "" },
  { id: "ship.email", label: "Customer email", get: (o) => o.recipient.email ?? "" },
  {
    id: "items.skus",
    label: "Item SKUs (joined with ;)",
    get: (o) => o.items.map((i) => i.sku).filter(Boolean).join("; "),
  },
  {
    id: "items.summary",
    label: "Items, e.g. '2 x Tee; 1 x Mug'",
    get: (o) => o.items.map((i) => `${i.quantity} x ${i.name}`).join("; "),
  },
  { id: "items.quantity", label: "Total quantity", get: (o) => String(o.items.reduce((s, i) => s + i.quantity, 0)) },
  {
    id: "order.weight",
    label: "Total weight",
    formats: ["oz", "lb", "kg", "g"],
    get: (o, f = "oz") => {
      const w = totalWeight(o);
      return w === undefined ? "" : round(convertWeight(w, o.weightUnit, f as WeightUnit));
    },
  },
  { id: "order.total", label: "Order total", get: (o) => round(o.total) },
  { id: "order.currency", label: "Order currency", get: (o) => o.currency },
  { id: "order.shippingMethod", label: "Shipping method chosen at checkout", get: (o) => o.shippingMethod ?? "" },
];

export const FIELD_BY_ID = new Map(WIX_FIELDS.map((f) => [f.id, f]));

/** True when any item is missing a weight, so the To ship tab can warn before download. */
export function isMissingWeight(order: OrderForExport): boolean {
  return totalWeight(order) === undefined;
}
