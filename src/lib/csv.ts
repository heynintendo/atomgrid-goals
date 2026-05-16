// RFC 4180-compliant CSV builder with a UTF-8 BOM prefix.  The BOM is
// what makes Excel-on-Windows correctly recognise the file as UTF-8 (so
// Indian / accented names render right out of the gate).  CRLF line
// endings match the RFC and are the safest cross-tool choice.

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type CsvCell = string | number | null | undefined;

export const UTF8_BOM = "﻿";

export function toCsv(rows: CsvCell[][]): string {
  const lines = rows.map((row) => row.map(csvEscape).join(","));
  return UTF8_BOM + lines.join("\r\n") + "\r\n";
}
