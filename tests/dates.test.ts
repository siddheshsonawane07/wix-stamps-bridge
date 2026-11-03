import { describe, expect, it } from "vitest";
import { isIsoDate, isIsoInstant } from "../src/core/dates.js";

describe("isIsoDate", () => {
  it("accepts real dates, including leap days", () => {
    for (const d of ["2026-11-12", "2028-02-29", "2026-12-31"]) expect(isIsoDate(d)).toBe(true);
  });
  it("rejects dates that don't exist and other shapes", () => {
    for (const d of ["2026-13-01", "2026-11-31", "2027-02-29", "2026-1-5", "12/11/2026", "", 20261112]) {
      expect(isIsoDate(d)).toBe(false);
    }
  });
});

describe("isIsoInstant", () => {
  it("accepts UTC timestamps and rejects the rest", () => {
    expect(isIsoInstant("2026-11-12T05:00:00.000Z")).toBe(true);
    expect(isIsoInstant("2026-11-12")).toBe(false);
    expect(isIsoInstant("2026-11-12T05:00:00+01:00")).toBe(false);
  });
});
