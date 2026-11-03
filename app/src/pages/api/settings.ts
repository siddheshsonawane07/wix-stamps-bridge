import type { APIRoute } from "astro";
import { isIsoDate, isIsoInstant, type ColumnMapping, type HistoryLayout, type OrderLayout } from "wix-stamps-bridge";
import { errorMessage, json, readJson, rejectUnlessOrderManager } from "../../backend/http.ts";
import { loadSettings, saveSettings, type StoreSettings } from "../../backend/settings.ts";

// Runs on every request; never built ahead of time.
export const prerender = false;

export const GET: APIRoute = async () => {
  const refused = await rejectUnlessOrderManager();
  if (refused) return refused;
  try {
    return json(await loadSettings());
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
};

const isText = (v: unknown, max = 500): v is string => typeof v === "string" && v.length <= max;

function validColumn(c: unknown): c is ColumnMapping {
  if (!c || typeof c !== "object") return false;
  const col = c as ColumnMapping;
  if (!isText(col.header, 200) || !["list", "store", "none"].includes(col.matchedBy)) return false;
  const s = col.source as ColumnMapping["source"] | undefined;
  if (!s) return false;
  if (s.kind === "blank") return true;
  if (s.kind === "fixed") return isText(s.value);
  if (s.kind === "field") return isText(s.field, 100) && (s.format === undefined || isText(s.format, 20));
  return false;
}

function validOrderLayout(v: unknown): v is OrderLayout {
  const layout = v as OrderLayout;
  return !!layout && Array.isArray(layout.columns) && layout.columns.length <= 300 && layout.columns.every(validColumn);
}

function validHistoryLayout(v: unknown): v is HistoryLayout {
  if (!v || typeof v !== "object") return false;
  return Object.entries(v).every(
    ([k, val]) => ["orderId", "trackingNumber", "carrier", "service"].includes(k) && (val === undefined || isText(val, 200)),
  );
}

export const POST: APIRoute = async ({ request }) => {
  const refused = await rejectUnlessOrderManager();
  if (refused) return refused;
  const body = await readJson<StoreSettings>(request);
  if (!body || typeof body !== "object") return json({ error: "Send the settings as JSON." }, 400);

  const next: StoreSettings = {};
  if (body.orderLayout !== undefined) {
    if (!validOrderLayout(body.orderLayout)) return json({ error: "The order file layout isn't valid." }, 400);
    next.orderLayout = body.orderLayout;
  }
  if (body.historyLayout !== undefined) {
    if (!validHistoryLayout(body.historyLayout)) return json({ error: "The history file layout isn't valid." }, 400);
    next.historyLayout = body.historyLayout;
  }
  if (body.startDate !== undefined || body.startAt !== undefined) {
    // Saved together: the date the store typed, and that date's midnight in its own time zone.
    if (!isIsoDate(body.startDate)) return json({ error: "Use a real date written like 2026-11-12." }, 400);
    if (!isIsoInstant(body.startAt)) return json({ error: "The start date's time is missing. Save it again from Setup." }, 400);
    const gapHours = Math.abs(Date.parse(body.startAt) - Date.parse(`${body.startDate}T00:00:00Z`)) / 36e5;
    if (gapHours > 15) return json({ error: "The start date and its time don't match. Save it again from Setup." }, 400);
    next.startDate = body.startDate;
    next.startAt = body.startAt;
  }
  if (body.defaultCarrier !== undefined) {
    if (!isText(body.defaultCarrier, 50)) return json({ error: "The default carrier isn't valid." }, 400);
    next.defaultCarrier = body.defaultCarrier;
  }
  try {
    return json(await saveSettings(next));
  } catch (error) {
    return json({ error: errorMessage(error) }, 500);
  }
};
