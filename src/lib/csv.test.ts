import { describe, expect, it } from "vitest";
import { csvEscape, toCsv } from "./csv";

describe("csvEscape — RFC 4180 escaping", () => {
  it("wraps a field containing a comma in quotes", () => {
    expect(csvEscape("Foo, bar")).toBe('"Foo, bar"');
  });

  it("wraps a field containing a double quote and doubles the embedded quote", () => {
    expect(csvEscape('She said "hi"')).toBe('"She said ""hi"""');
  });

  it("wraps a field containing a newline", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("leaves plain fields unwrapped", () => {
    expect(csvEscape("Riya Sharma")).toBe("Riya Sharma");
    expect(csvEscape(42)).toBe("42");
  });

  it("handles null and undefined as empty strings", () => {
    expect(csvEscape(null)).toBe("");
    expect(csvEscape(undefined)).toBe("");
  });
});

describe("toCsv — full file format", () => {
  it("prefixes the output with the UTF-8 BOM (U+FEFF)", () => {
    const out = toCsv([["header"]]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("uses CRLF row endings per RFC 4180", () => {
    const out = toCsv([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(out).toBe("﻿a,b\r\nc,d\r\n");
  });

  it("escapes nested fields correctly across a multi-row table", () => {
    const out = toCsv([
      ["Name", "Comment"],
      ['She said "great"', "Line1\nLine2"],
      ["Plain, plain", "value"],
    ]);
    expect(out).toBe(
      '﻿Name,Comment\r\n"She said ""great""","Line1\nLine2"\r\n"Plain, plain",value\r\n',
    );
  });
});
