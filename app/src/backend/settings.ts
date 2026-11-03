import { auth } from "@wix/essentials";
import { collections, items } from "@wix/data";
import type { HistoryLayout, OrderLayout } from "wix-stamps-bridge";
import { collectionIdSuffix } from "../extensions/backend/data-collections/settings.ts";

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

const SETTINGS_ITEM_ID = "settings";
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

const listDataCollections = auth.elevate(collections.listDataCollections);
const getItem = auth.elevate(items.get);
const saveItem = auth.elevate(items.save);

let cachedCollectionId: string | undefined;

/**
 * Wix prefixes app collection IDs with the app's namespace ("@company/app-name/..."), which isn't known
 * until the app is registered. Finding the collection by its suffix keeps that out of the code.
 * The full ID is the same on every site that installs the app, so caching it is safe.
 */
async function settingsCollectionId(): Promise<string> {
  if (cachedCollectionId) return cachedCollectionId;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { collections: list } = await listDataCollections({ paging: { limit: PAGE_SIZE, offset: page * PAGE_SIZE } });
    const match = (list ?? []).find((c) => c._id?.endsWith(`/${collectionIdSuffix}`));
    if (match?._id) {
      cachedCollectionId = match._id;
      return match._id;
    }
    if ((list ?? []).length < PAGE_SIZE) break;
  }
  throw new Error(
    "The Stamps Bridge settings collection isn't on this site yet. Check the site has the CMS added, then reinstall the app.",
  );
}

export async function loadSettings(): Promise<StoreSettings> {
  const item = await getItem(await settingsCollectionId(), SETTINGS_ITEM_ID);
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
  await saveItem(await settingsCollectionId(), {
    _id: SETTINGS_ITEM_ID,
    title: "Stamps Bridge settings",
    ...merged,
  });
  return merged;
}
