import {
  ClipboardCheck,
  FileCheck,
  KeyRound,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import type { AuditAction } from "@prisma/client";

export interface ActivityRow {
  id:        string;
  actorName: string;
  action:    AuditAction;
  reason:    string | null;
  createdAt: Date;
}

interface ActivityFeedProps {
  rows:  ActivityRow[];
  title: string;
  emptyHint: string;
}

const ICON_FOR: Record<AuditAction, LucideIcon> = {
  GOAL_UNLOCKED:        KeyRound,
  GOAL_TARGET_EDITED:   FileCheck,
  GOAL_WEIGHTAGE_EDITED:FileCheck,
  GOAL_DELETED:         RotateCcw,
  GOAL_RESTORED:        RotateCcw,
  ADMIN_FORCE_APPROVE:  ShieldAlert,
  SHEET_UNLOCKED:       KeyRound,
  ESCALATION_RESOLVED:  ClipboardCheck,
};

const VERB_FOR: Record<AuditAction, string> = {
  GOAL_UNLOCKED:        "unlocked a goal",
  GOAL_TARGET_EDITED:   "edited a goal target",
  GOAL_WEIGHTAGE_EDITED:"edited goal weightage",
  GOAL_DELETED:         "deleted a goal",
  GOAL_RESTORED:        "restored a goal",
  ADMIN_FORCE_APPROVE:  "force-approved a sheet",
  SHEET_UNLOCKED:       "unlocked a goal sheet",
  ESCALATION_RESOLVED:  "resolved an escalation",
};

export function ActivityFeed({ rows, title, emptyHint }: ActivityFeedProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-6">
      <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">{emptyHint}</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {rows.map((r) => {
            const Icon = ICON_FOR[r.action] ?? Send;
            return (
              <li key={r.id} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-surface-2">
                  <Icon size={14} strokeWidth={1.5} className="text-text-tertiary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">
                    <span className="font-medium">{r.actorName}</span>
                    <span className="text-text-secondary"> {VERB_FOR[r.action] ?? "logged an event"}</span>
                  </p>
                  {r.reason ? (
                    <p className="mt-0.5 truncate text-xs text-text-tertiary" title={r.reason}>
                      {r.reason}
                    </p>
                  ) : null}
                  <p className="mt-0.5 font-mono text-[11px] text-text-tertiary tabular-nums" suppressHydrationWarning>
                    {formatRelative(r.createdAt)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelative(when: Date): string {
  const diffMs   = Date.now() - when.getTime();
  const diffMin  = Math.round(diffMs / 60000);
  const diffHour = Math.round(diffMs / 3_600_000);
  const diffDay  = Math.round(diffMs / 86_400_000);
  if (diffMin < 1)   return "just now";
  if (diffMin < 60)  return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay  < 14) return `${diffDay}d ago`;
  return when.toISOString().slice(0, 10);
}
