import { NextResponse, type NextRequest } from "next/server";
import { format } from "date-fns";
import JSZip from "jszip";
import { Role } from "@prisma/client";
import * as XLSX from "xlsx";
import { getCurrentUser } from "@/lib/auth";
import {
  applyCompletionFilters,
  loadCompletionScope,
  parsePeriod,
} from "@/lib/completion";
import { toCsv } from "@/lib/csv";
import { getSystemDate } from "@/lib/system-date";
import type { CompletionRow } from "@/components/completion-table";

const CHECKIN_LABEL: Record<string, string> = {
  NOT_STARTED:    "Not started",
  IN_PROGRESS:    "In progress",
  SUBMITTED:      "Submitted",
  OVERDUE:        "Overdue",
  NOT_APPLICABLE: "",
};

const SHEET_LABEL: Record<string, string> = {
  MISSING:   "No sheet",
  DRAFT:     "Draft",
  SUBMITTED: "Submitted",
  APPROVED:  "Approved",
  LOCKED:    "Locked",
  RETURNED:  "Returned",
};

type Cell = string | number | null;

// Row order mirrors HEADERS.  Avg score stays a JS number so SheetJS
// types the XLSX cell as numeric (Excel formulas work natively).  CSV
// stringifies it during toCsv() anyway.
function rowToCells(
  row: CompletionRow,
  period: string,
  exportedAtISO: string,
): Cell[] {
  const isNA = row.checkInState === "NOT_APPLICABLE";
  return [
    row.employeeName,
    row.employeeEmail,
    row.managerName ?? "",
    SHEET_LABEL[row.sheetState] ?? row.sheetState,
    isNA ? "—" : CHECKIN_LABEL[row.checkInState],
    isNA ? "—" : `${row.goalsLogged}/${row.goalsTotal}`,
    isNA || row.avgScore == null
      ? ""
      : Number((row.avgScore * 100).toFixed(2)),
    period,
    exportedAtISO,
  ];
}

const HEADERS = [
  "Employee name",
  "Employee email",
  "Manager",
  "Sheet status",
  "Check-in status",
  "Goals logged",
  "Avg score %",
  "Period",
  "Exported at",
];

// Builds an XLSX workbook from the same cell matrix the CSV serialiser
// consumes.  Numeric cells (avg score) preserve their JS number type so
// Excel renders them as numbers and formulas (=AVG / =SUM) work directly.
// SheetJS Community's writer doesn't emit `<pane>` elements for frozen
// rows, so we splice it into sheet1.xml after write.
async function buildXlsx(cells: Cell[][]): Promise<Uint8Array> {
  const ws = XLSX.utils.aoa_to_sheet(cells);

  // Column widths: max content length per column, clamped [12, 50].
  const colCount = cells[0]?.length ?? 0;
  ws["!cols"] = Array.from({ length: colCount }, (_, c) => {
    const widest = cells.reduce((max, row) => {
      const v = row[c];
      const len = v == null ? 0 : String(v).length;
      return Math.max(max, len);
    }, 0);
    return { wch: Math.max(12, Math.min(50, widest + 2)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Completion");

  const raw = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return injectFrozenHeader(new Uint8Array(raw));
}

// Post-processes the xlsx zip to inject a frozen-header <pane> element
// into the first sheet's <sheetView>.  Replacement only touches the
// known fixed shape that SheetJS Community emits — if that shape ever
// changes upstream, this no-ops silently and the file still opens.
async function injectFrozenHeader(buf: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(buf);
  const path = "xl/worksheets/sheet1.xml";
  const file = zip.file(path);
  if (!file) return buf;
  const xml = await file.async("string");
  const next = xml.replace(
    /<sheetView([^>]*)\/>/,
    '<sheetView$1><pane state="frozen" ySplit="1" topLeftCell="A2" activePane="bottomLeft"/></sheetView>',
  );
  if (next === xml) return buf;
  zip.file(path, next);
  return zip.generateAsync({ type: "uint8array" });
}

export async function GET(req: NextRequest) {
  // Auth + role gate is re-derived from session — query params can only
  // narrow within an already-authorised scope.  Employees get 403; managers
  // are pinned to their direct reports regardless of any ?manager= they
  // try to pass.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return NextResponse.json(
      { error: "Completion export is manager+ only" },
      { status: 403 },
    );
  }

  const params = req.nextUrl.searchParams;
  const formatParam = params.get("format")?.toLowerCase();
  if (formatParam !== "csv" && formatParam !== "xlsx") {
    return NextResponse.json(
      { error: "format must be csv or xlsx" },
      { status: 400 },
    );
  }

  const period = parsePeriod(params.get("period") ?? undefined);

  const managerFilter = params.get("manager")?.trim() || undefined;
  const sheetFilter = params.get("sheet")?.trim() || undefined;
  const checkFilter = params.get("check")?.trim() || undefined;

  const scope = await loadCompletionScope(user, period);
  if (!scope) {
    return NextResponse.json({ error: "No active cycle" }, { status: 404 });
  }

  const rows = applyCompletionFilters(scope.rows, {
    manager: managerFilter,
    sheet: sheetFilter,
    check: checkFilter,
  });

  const systemDate = await getSystemDate();
  const exportedAtISO = systemDate.toISOString();
  const datePart = format(systemDate, "yyyy-MM-dd");

  const cells: Cell[][] = [
    HEADERS,
    ...rows.map((r) => rowToCells(r, period, exportedAtISO)),
  ];

  if (formatParam === "csv") {
    const filename = `atomberg-completion-${period}-${datePart}.csv`;
    return new NextResponse(toCsv(cells), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // xlsx branch — wrap the Uint8Array as a Blob so NextResponse's BodyInit
  // type accepts it cleanly (raw Uint8Array works at runtime but tsc
  // narrows BodyInit too strictly in current types).
  const filename = `atomberg-completion-${period}-${datePart}.xlsx`;
  const buf = await buildXlsx(cells);
  const blob = new Blob([buf as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return new NextResponse(blob, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "Content-Length": String(buf.length),
    },
  });
}
