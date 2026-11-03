import type { APIRoute } from "astro";
import { errorMessage, json, readJson, rejectUnlessDashboardUser } from "../../backend/http.ts";
import { fulfil, type ShipmentToFulfil } from "../../backend/orders.ts";
import { loadSettings } from "../../backend/settings.ts";

// Runs on every request; never built ahead of time.
export const prerender = false;

const MAX_SHIPMENTS = 500;

function validShipment(s: unknown): s is ShipmentToFulfil {
  const v = s as ShipmentToFulfil;
  return (
    !!v &&
    typeof v.orderNumber === "string" && v.orderNumber.length > 0 && v.orderNumber.length <= 50 &&
    typeof v.trackingNumber === "string" && v.trackingNumber.length > 0 && v.trackingNumber.length <= 100 &&
    typeof v.carrier === "string" && v.carrier.length <= 100
  );
}

/** Marks the confirmed orders shipped with their tracking numbers. */
export const POST: APIRoute = async ({ request }) => {
  const refused = await rejectUnlessDashboardUser();
  if (refused) return refused;
  const body = await readJson<{ shipments?: unknown }>(request);
  const shipments = body?.shipments;
  if (!Array.isArray(shipments) || shipments.length === 0 || shipments.length > MAX_SHIPMENTS || !shipments.every(validShipment)) {
    return json({ error: `Send between 1 and ${MAX_SHIPMENTS} shipments, each with an order number and tracking number.` }, 400);
  }
  try {
    const { defaultCarrier = "" } = await loadSettings();
    return json({ results: await fulfil(shipments, defaultCarrier) });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
};
