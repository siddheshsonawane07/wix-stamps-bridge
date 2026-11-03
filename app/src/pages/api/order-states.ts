import type { APIRoute } from "astro";
import { errorMessage, json, readJson, rejectUnlessDashboardUser } from "../../backend/http.ts";
import { orderStates } from "../../backend/orders.ts";

// Runs on every request; never built ahead of time.
export const prerender = false;

const MAX_NUMBERS = 1000;

/** Looks up the orders named in an uploaded history file, so the Upload tab can show what will happen. */
export const POST: APIRoute = async ({ request }) => {
  const refused = await rejectUnlessDashboardUser();
  if (refused) return refused;
  const body = await readJson<{ numbers?: unknown }>(request);
  const numbers = body?.numbers;
  if (!Array.isArray(numbers) || numbers.length > MAX_NUMBERS || !numbers.every((n) => typeof n === "string" && n.length <= 50)) {
    return json({ error: `Send up to ${MAX_NUMBERS} order numbers.` }, 400);
  }
  try {
    return json({ orders: await orderStates(numbers) });
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
};
