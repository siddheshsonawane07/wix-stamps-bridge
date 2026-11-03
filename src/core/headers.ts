/**
 * The fixed match lists. No AI and no fuzzy matching: a header is normalised
 * (lower case, letters and digits only) and looked up exactly. Anything not
 * listed is left for the store to choose.
 *
 * These are seed lists. Add entries when a real Stamps.com file uses a header
 * that isn't here, with a test that pins it. Headers that could mean more than
 * one thing ("Name", "Address", "Weight" with no unit, "Total") are left out on
 * purpose, so the store chooses.
 */

export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

interface KnownOrderHeader {
  field: string;
  format?: string;
}

const ORDER_HEADERS: Record<string, KnownOrderHeader> = {
  orderid: { field: "order.number" },
  // Stamps.com's help calls it "the Order ID (required) field".
  orderidrequired: { field: "order.number" },
  ordernumber: { field: "order.number" },
  orderno: { field: "order.number" },
  orderdate: { field: "order.date" },
  recipientname: { field: "ship.fullName" },
  recipient: { field: "ship.fullName" },
  fullname: { field: "ship.fullName" },
  company: { field: "ship.company" },
  recipientcompany: { field: "ship.company" },
  address1: { field: "ship.address1" },
  addressline1: { field: "ship.address1" },
  address2: { field: "ship.address2" },
  addressline2: { field: "ship.address2" },
  city: { field: "ship.city" },
  state: { field: "ship.region" },
  province: { field: "ship.region" },
  county: { field: "ship.region" },
  stateprovince: { field: "ship.region" },
  zip: { field: "ship.postalCode" },
  zipcode: { field: "ship.postalCode" },
  postalcode: { field: "ship.postalCode" },
  postcode: { field: "ship.postalCode" },
  zippostalcode: { field: "ship.postalCode" },
  country: { field: "ship.country", format: "code" },
  countrycode: { field: "ship.country", format: "code" },
  countryname: { field: "ship.country", format: "name" },
  phone: { field: "ship.phone" },
  phonenumber: { field: "ship.phone" },
  email: { field: "ship.email" },
  emailaddress: { field: "ship.email" },
  sku: { field: "items.skus" },
  skus: { field: "items.skus" },
  itemsku: { field: "items.skus" },
  items: { field: "items.summary" },
  itemdescription: { field: "items.summary" },
  quantity: { field: "items.quantity" },
  qty: { field: "items.quantity" },
  weightoz: { field: "order.weight", format: "oz" },
  weightlb: { field: "order.weight", format: "lb" },
  weightlbs: { field: "order.weight", format: "lb" },
  weightkg: { field: "order.weight", format: "kg" },
  weightg: { field: "order.weight", format: "g" },
  ordertotal: { field: "order.total" },
  ordervalue: { field: "order.total" },
  currency: { field: "order.currency" },
  shippingmethod: { field: "order.shippingMethod" },
  requestedservice: { field: "order.shippingMethod" },
};

export function lookupOrderHeader(header: string): KnownOrderHeader | undefined {
  return ORDER_HEADERS[normaliseHeader(header)];
}

export type HistoryField = "orderId" | "trackingNumber" | "carrier" | "service";

const HISTORY_HEADERS: Record<string, HistoryField> = {
  orderid: "orderId",
  ordernumber: "orderId",
  orderno: "orderId",
  trackingnumber: "trackingNumber",
  tracking: "trackingNumber",
  trackingno: "trackingNumber",
  trackingid: "trackingNumber",
  carrier: "carrier",
  service: "service",
  mailclass: "service",
  serviceclass: "service",
};

export function lookupHistoryHeader(header: string): HistoryField | undefined {
  return HISTORY_HEADERS[normaliseHeader(header)];
}
