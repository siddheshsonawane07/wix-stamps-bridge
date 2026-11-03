/** True for a real calendar date written as YYYY-MM-DD. Rejects shapes like 2026-13-01 or 2026-11-31. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** True for a full ISO 8601 timestamp such as 2026-11-12T05:00:00.000Z. */
export function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
