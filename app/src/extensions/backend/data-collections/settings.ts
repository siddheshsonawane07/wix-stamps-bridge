/**
 * One item per site, holding that store's setup: its Stamps.com file layouts and everyday settings.
 * Wix prefixes the ID with the app namespace, e.g. "@company/app-name/stamps-bridge-settings".
 */
export const collectionIdSuffix = "stamps-bridge-settings";

export default {
  idSuffix: collectionIdSuffix,
  displayName: "Stamps Bridge settings",
  fields: [
    { type: "TEXT" as const, displayName: "Name", key: "title" },
    { type: "OBJECT" as const, displayName: "Order file layout", key: "orderLayout" },
    { type: "OBJECT" as const, displayName: "History file layout", key: "historyLayout" },
    { type: "TEXT" as const, displayName: "Only include orders from", key: "startDate" },
    { type: "TEXT" as const, displayName: "Start moment (UTC)", key: "startAt" },
    { type: "TEXT" as const, displayName: "Default carrier", key: "defaultCarrier" },
  ],
  displayField: "title",
  // PRIVILEGED: the site owner and collaborators. The app's backend reads and writes with elevated access.
  dataPermissions: {
    itemInsert: "PRIVILEGED" as const,
    itemRead: "PRIVILEGED" as const,
    itemRemove: "PRIVILEGED" as const,
    itemUpdate: "PRIVILEGED" as const,
  },
  indexes: [],
  initialData: [],
};
