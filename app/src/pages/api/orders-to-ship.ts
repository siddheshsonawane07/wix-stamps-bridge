import type { APIRoute } from "astro";
import { errorMessage, json, rejectUnlessOrderManager } from "../../backend/http.ts";
import { ordersToShip } from "../../backend/orders.ts";
import { loadSettings } from "../../backend/settings.ts";

// Runs on every request; never built ahead of time.
export const prerender = false;

/** Paid, unfulfilled orders placed on or after the store's start date. */
export const GET: APIRoute = async () => {
  const refused = await rejectUnlessOrderManager();
  if (refused) return refused;
  try {
    const { startDate, startAt } = await loadSettings();
    if (!startDate) return json({ error: "Set 'Only include orders from' in Setup first." }, 409);
    return json(await ordersToShip(startAt ?? `${startDate}T00:00:00.000Z`));
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
};
