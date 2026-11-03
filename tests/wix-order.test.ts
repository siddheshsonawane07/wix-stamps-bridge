import { describe, expect, it } from "vitest";
import { fromWixOrder, fulfilmentLineItems, stateOfWixOrder, type WixOrderLike } from "../src/core/wix-order.js";

const WIX_ORDER: WixOrderLike = {
  _id: "abc-123",
  number: "10342",
  _createdDate: new Date("2026-11-14T10:22:00Z"),
  status: "APPROVED",
  paymentStatus: "PAID",
  fulfillmentStatus: "NOT_FULFILLED",
  weightUnit: "LB",
  currency: "USD",
  buyerInfo: { email: "a.thompson@example.com" },
  priceSummary: { total: { amount: "52.00" } },
  shippingInfo: {
    title: "Standard",
    logistics: {
      shippingDestination: {
        address: {
          country: "US",
          subdivision: "US-NY",
          city: "Brooklyn",
          postalCode: "11201",
          streetAddress: { number: "10", name: "Example Ave" },
          addressLine2: "Apt 4",
        },
        contactDetails: { firstName: "A.", lastName: "Thompson", phone: "555-0101" },
      },
    },
  },
  lineItems: [
    { _id: "li-1", quantity: 2, productName: { original: "T-shirt" }, price: { amount: "20" },
      physicalProperties: { weight: 0.25, sku: "TEE-M", shippable: true } },
    { _id: "li-2", quantity: 1, productName: { original: "Gift card" }, price: { amount: "10" },
      physicalProperties: { shippable: false } },
  ],
};

describe("fromWixOrder", () => {
  it("maps the shipping address, contact and shippable items", () => {
    expect(fromWixOrder(WIX_ORDER)).toEqual({
      number: "10342",
      createdAt: "2026-11-14T10:22:00.000Z",
      recipient: {
        fullName: "A. Thompson",
        company: undefined,
        address1: "10 Example Ave",
        address2: "Apt 4",
        city: "Brooklyn",
        region: "NY",
        postalCode: "11201",
        countryCode: "US",
        phone: "555-0101",
        email: "a.thompson@example.com",
      },
      items: [{ sku: "TEE-M", name: "T-shirt", quantity: 2, unitPrice: 20, weight: 0.25 }],
      weightUnit: "lb",
      total: 52,
      currency: "USD",
      shippingMethod: "Standard",
    });
  });

  it("skips orders with no shipping address", () => {
    expect(fromWixOrder({ ...WIX_ORDER, shippingInfo: { title: "Pickup" } })).toBeUndefined();
  });

  it("treats weights as missing when the store's weight unit is unknown", () => {
    const order = fromWixOrder({ ...WIX_ORDER, weightUnit: "UNSPECIFIED_WEIGHT_UNIT" })!;
    expect(order.items[0].weight).toBeUndefined();
  });
});

describe("stateOfWixOrder", () => {
  it("reads cancelled, not fulfilled and fulfilled", () => {
    expect(stateOfWixOrder({ ...WIX_ORDER, status: "CANCELED" })?.status).toBe("cancelled");
    expect(stateOfWixOrder(WIX_ORDER)?.status).toBe("not_fulfilled");
    expect(stateOfWixOrder({ ...WIX_ORDER, fulfillmentStatus: "PARTIALLY_FULFILLED" })?.status).toBe("fulfilled");
  });

  it("never treats unpaid or unapproved orders as ready to ship", () => {
    for (const change of [
      { paymentStatus: "NOT_PAID" },
      { paymentStatus: "PENDING" },
      { status: "PENDING" },
      { status: "INITIALIZED" },
      { status: "REJECTED" },
    ]) {
      expect(stateOfWixOrder({ ...WIX_ORDER, ...change })?.status).toBe("not_ready");
    }
  });
});

describe("fulfilmentLineItems", () => {
  it("includes every shippable item in full", () => {
    expect(fulfilmentLineItems(WIX_ORDER)).toEqual([{ _id: "li-1", quantity: 2 }]);
  });
});
