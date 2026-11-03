import { describe, expect, it } from "vitest";
import { planFulfilments, readShipments, toWixShippingProvider } from "../src/core/history.js";
import { historyLayoutFromExport } from "../src/core/layout.js";
import type { OrderState } from "../src/core/types.js";
import { HISTORY_CSV } from "./fixtures.js";

const ORDERS: OrderState[] = [
  { orderId: "w-342", number: "10342", status: "not_fulfilled" },
  { orderId: "w-343", number: "10343", status: "not_fulfilled" },
  { orderId: "w-339", number: "10339", status: "fulfilled" },
  { orderId: "w-350", number: "10350", status: "cancelled" },
];

describe("readShipments", () => {
  it("reads rows using the saved layout and strips a leading #", () => {
    const rows = readShipments(HISTORY_CSV, historyLayoutFromExport(HISTORY_CSV));
    expect(rows[1]).toEqual({
      line: 3,
      orderNumber: "10343",
      trackingNumber: "GP82736451",
      carrier: "USPS GlobalPost",
      service: "GlobalPost Standard",
    });
  });

  it("explains when the file is missing a saved column", () => {
    const layout = { orderId: "Order ID", trackingNumber: "Tracking #" };
    expect(() => readShipments("Order ID,Tracking Number\n1,2", layout)).toThrow(/no "Tracking #" column/);
  });
});

describe("planFulfilments", () => {
  const rows = readShipments(HISTORY_CSV, historyLayoutFromExport(HISTORY_CSV));

  it("marks each row ready, already shipped or not matched", () => {
    const plan = planFulfilments(rows, ORDERS);
    expect(plan.map((p) => [p.orderNumber, p.status])).toEqual([
      ["10342", "ready"],
      ["10343", "ready"],
      ["10339", "already_shipped"],
      ["", "not_matched"],
    ]);
    expect(plan[0].orderId).toBe("w-342");
  });

  it("is safe to repeat: a second upload after confirming changes nothing", () => {
    const afterConfirm = ORDERS.map((o) => (o.status === "not_fulfilled" ? { ...o, status: "fulfilled" as const } : o));
    expect(planFulfilments(rows, afterConfirm).filter((p) => p.status === "ready")).toHaveLength(0);
  });

  it("flags cancelled orders, extra labels and rows without tracking", () => {
    const plan = planFulfilments(
      [
        { line: 2, orderNumber: "10350", trackingNumber: "T1", carrier: "UPS", service: "" },
        { line: 3, orderNumber: "10342", trackingNumber: "T2", carrier: "UPS", service: "" },
        { line: 4, orderNumber: "10342", trackingNumber: "T3", carrier: "UPS", service: "" },
        { line: 5, orderNumber: "10343", trackingNumber: "", carrier: "UPS", service: "" },
      ],
      ORDERS,
    );
    expect(plan.map((p) => p.status)).toEqual(["cancelled", "ready", "extra_label", "no_tracking"]);
  });
});

describe("toWixShippingProvider", () => {
  it("maps common carriers and passes others through", () => {
    expect(toWixShippingProvider("UPS")).toBe("ups");
    expect(toWixShippingProvider("USPS")).toBe("usps");
    expect(toWixShippingProvider("DHL Express")).toBe("dhl");
    expect(toWixShippingProvider("GlobalPost")).toBe("GlobalPost");
    expect(toWixShippingProvider("USPS GlobalPost")).toBe("USPS GlobalPost");
  });
});
