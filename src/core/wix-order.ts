import type { OrderForExport, OrderState, WeightUnit } from "./types.js";

/**
 * The parts of a Wix eCom order (Orders API v1) the app reads. Kept structural so this file has no
 * Wix dependency and can be unit tested. Field names match `@wix/ecom` `orders.Order`.
 */
export interface WixOrderLike {
  _id?: string | null;
  number?: string;
  _createdDate?: Date | string | null;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  weightUnit?: string;
  currency?: string | null;
  buyerInfo?: { email?: string | null };
  priceSummary?: { total?: { amount?: string } };
  shippingInfo?: {
    title?: string;
    logistics?: {
      shippingDestination?: {
        address?: {
          country?: string | null;
          subdivision?: string | null;
          city?: string | null;
          postalCode?: string | null;
          addressLine1?: string | null;
          addressLine2?: string | null;
          streetAddress?: { number?: string; name?: string };
        };
        contactDetails?: {
          firstName?: string | null;
          lastName?: string | null;
          phone?: string | null;
          company?: string | null;
        };
      };
    };
  };
  lineItems?: Array<{
    _id?: string;
    quantity?: number;
    productName?: { original?: string };
    price?: { amount?: string };
    physicalProperties?: { weight?: number | null; sku?: string | null; shippable?: boolean };
  }>;
}

function toUnit(unit?: string): WeightUnit | undefined {
  if (unit === "KG") return "kg";
  if (unit === "LB") return "lb";
  return undefined;
}

/** Wix stores "US-NY" style subdivisions; Stamps.com wants "NY". */
function region(subdivision?: string | null): string | undefined {
  if (!subdivision) return undefined;
  const dash = subdivision.indexOf("-");
  return dash > 0 ? subdivision.slice(dash + 1) : subdivision;
}

/** Converts a Wix order into the app's export shape. Returns undefined for orders with no shipping address (e.g. pickup). */
export function fromWixOrder(order: WixOrderLike): OrderForExport | undefined {
  const destination = order.shippingInfo?.logistics?.shippingDestination;
  const address = destination?.address;
  if (!address || !order.number) return undefined;
  const contact = destination?.contactDetails ?? {};
  const unit = toUnit(order.weightUnit);
  const street = address.streetAddress;
  const address1 =
    address.addressLine1 || [street?.number, street?.name].filter(Boolean).join(" ") || "";

  const created = order._createdDate;
  return {
    number: order.number,
    createdAt: created instanceof Date ? created.toISOString() : created ?? new Date(0).toISOString(),
    recipient: {
      fullName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
      company: contact.company ?? undefined,
      address1,
      address2: address.addressLine2 ?? undefined,
      city: address.city ?? "",
      region: region(address.subdivision),
      postalCode: address.postalCode ?? "",
      countryCode: address.country ?? "",
      phone: contact.phone ?? undefined,
      email: order.buyerInfo?.email ?? undefined,
    },
    items: (order.lineItems ?? [])
      .filter((li) => li.physicalProperties?.shippable !== false)
      .map((li) => ({
        sku: li.physicalProperties?.sku ?? "",
        name: li.productName?.original ?? "",
        quantity: li.quantity ?? 1,
        unitPrice: Number(li.price?.amount ?? 0),
        // Without a known unit the weight can't be converted, so treat it as missing.
        weight: unit && typeof li.physicalProperties?.weight === "number" ? li.physicalProperties.weight : undefined,
      })),
    weightUnit: unit ?? "lb",
    total: Number(order.priceSummary?.total?.amount ?? 0),
    currency: order.currency ?? "",
    shippingMethod: order.shippingInfo?.title,
  };
}

/** What the Upload tab needs to know about an order. Partly fulfilled orders count as shipped, so nothing ships twice. */
export function stateOfWixOrder(order: WixOrderLike): OrderState | undefined {
  if (!order._id || !order.number) return undefined;
  const status =
    order.status === "CANCELED"
      ? "cancelled"
      : order.fulfillmentStatus === "NOT_FULFILLED"
        ? "not_fulfilled"
        : "fulfilled";
  return { orderId: order._id, number: order.number, status };
}

/** Line items to include in a fulfilment: every shippable item, in full. */
export function fulfilmentLineItems(order: WixOrderLike): Array<{ _id: string; quantity: number }> {
  return (order.lineItems ?? [])
    .filter((li) => li._id && li.physicalProperties?.shippable !== false)
    .map((li) => ({ _id: li._id as string, quantity: li.quantity ?? 1 }));
}
