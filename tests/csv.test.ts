import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "../src/core/csv.js";

describe("parseCsv", () => {
  it("reads quoted cells with commas, quotes and line breaks", () => {
    const rows = parseCsv('a,"b, c","say ""hi""","two\nlines"\r\n1,2,3,4\r\n');
    expect(rows).toEqual([
      ["a", "b, c", 'say "hi"', "two\nlines"],
      ["1", "2", "3", "4"],
    ]);
  });

  it("drops a leading BOM and blank lines", () => {
    expect(parseCsv("﻿x,y\n\n1,2\n")).toEqual([
      ["x", "y"],
      ["1", "2"],
    ]);
  });

  it("keeps empty cells", () => {
    expect(parseCsv("a,,c")).toEqual([["a", "", "c"]]);
  });
});

describe("toCsv", () => {
  it("round-trips through parseCsv", () => {
    const rows = [
      ["Order ID", "Note"],
      ["1", 'He said "go", then left\nfast'],
      ["2", " padded "],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
