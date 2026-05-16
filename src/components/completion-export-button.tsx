"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompletionExportButtonProps {
  // Current ?key=value pairs to preserve in the export URL — period,
  // manager filter, sheet/check filters — so the file matches exactly
  // what the user sees in the table.
  currentParams: Record<string, string>;
}

function buildUrl(format: "csv" | "xlsx", params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, format }).toString();
  return `/api/reports/completion/export?${qs}`;
}

export function CompletionExportButton({
  currentParams,
}: CompletionExportButtonProps) {
  const csvUrl = buildUrl("csv", currentParams);
  const xlsxUrl = buildUrl("xlsx", currentParams);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Download size={14} strokeWidth={1.75} />
          Export
          <ChevronDown
            size={12}
            strokeWidth={1.75}
            className="text-text-muted"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export current view</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={csvUrl} download className="gap-3">
            <FileText
              size={14}
              strokeWidth={1.75}
              className="text-text-muted"
            />
            <div className="flex flex-col">
              <span className="font-medium text-text">Download as CSV</span>
              <span className="text-xs text-text-muted">
                Comma-separated, opens anywhere
              </span>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={xlsxUrl} download className="gap-3">
            <FileSpreadsheet
              size={14}
              strokeWidth={1.75}
              className="text-text-muted"
            />
            <div className="flex flex-col">
              <span className="font-medium text-text">Download as XLSX</span>
              <span className="text-xs text-text-muted">
                Excel workbook with frozen header
              </span>
            </div>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
