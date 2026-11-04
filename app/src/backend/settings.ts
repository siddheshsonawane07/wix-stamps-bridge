import { auth } from "@wix/essentials";
import { collections, items } from "@wix/data";
import type { HistoryLayout, OrderLayout } from "wix-stamps-bridge";

export interface StoreSettings {
  orderLayout?: OrderLayout;
  historyLayout?: HistoryLayout;
  /** The date the store typed (YYYY-MM-DD), shown in Setup. */
  startDate?: string;
  /**
   * The same date as an exact moment: midnight in the store's own time zone, worked out in the browser
   * when it was saved. Orders placed before it are never sent to Stamps.com.
   */
  startAt?: string;
  defaultCarrier?: string;
}

/**
 * The app keeps one settings item per site in a CMS collection it creates itself on first use.
 * (Wix's data collections extension didn't create its collection on install, and wouldn't on sites
 * that add the CMS after installing the app, so the app doesn't rely on it.)
 */
const COLLECTION_ID = "ShipByFileSettings";
const SETTINGS_ITEM_ID = "settings";

const getDataCollection = auth.elevate(collections.getDataCollection);
const createDataCollection = auth.elevate(collections.createDataCollection);
const getItem = auth.elevate(items.get);
const saveItem = auth.elevate(items.save);

/** Per site, so remember by site: one backend serves every site that installs the app. */
const ensured = new Set<string>();

function isNotFound(error: unknown): boolean {
  const e = error as { details?: { applicationError?: { code?: string } }; message?: string; status?: number };
  return (
    e?.status === 404 ||
    /not.?found|WDE0025|doesn't exist|does not exist/i.test(`${e?.details?.applicationError?.code ?? ""} ${e?.message ?? ""}`)
  );
}

async function ensureCollection(siteKey: string): Promise<void> {
  if (ensured.has(siteKey)) return;
  try {
    await getDataCollection(COLLECTION_ID);
  } catch (error) {
    if (!isNotFound(error)) throw error;
    await createDataCollection({
      _id: COLLECTION_ID,
      displayName: "Ship by File settings",
      fields: [
        { key: "title", displayName: "Name", type: "TEXT" },
        { key: "orderLayout", displayName: "Order file layout", type: "OBJECT" },
        { key: "historyLayout", displayName: "History file layout", type: "OBJECT" },
        { key: "startDate", displayName: "Only include orders from", type: "TEXT" },
        { key: "startAt", displayName: "Start moment (UTC)", type: "TEXT" },
        { key: "defaultCarrier", displayName: "Default carrier", type: "TEXT" },
      ],
      // Only site admins can see or change it directly. The app reads and writes with elevated access.
      permissions: { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ADMIN" },
    });
  }
  ensured.add(siteKey);
}

async function siteKey(): Promise<string> {
  try {
    return (await auth.getTokenInfo()).siteId || "unknown";
  } catch {
    return "unknown";
  }
}

export async function loadSettings(): Promise<StoreSettings> {
  await ensureCollection(await siteKey());
  const item = await getItem(COLLECTION_ID, SETTINGS_ITEM_ID);
  if (!item) return {};
  return {
    orderLayout: item.orderLayout ?? undefined,
    historyLayout: item.historyLayout ?? undefined,
    startDate: item.startDate || undefined,
    startAt: item.startAt || undefined,
    defaultCarrier: item.defaultCarrier || undefined,
  };
}

export async function saveSettings(next: StoreSettings): Promise<StoreSettings> {
  const merged = { ...(await loadSettings()), ...next };
  await saveItem(COLLECTION_ID, {
    _id: SETTINGS_ITEM_ID,
    title: "Ship by File settings",
    ...merged,
  });
  return merged;
}
