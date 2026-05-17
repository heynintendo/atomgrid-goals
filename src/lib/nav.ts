import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Clock,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  // Additional path prefixes that should also activate this nav item.
  // e.g. Check-ins (href=/employee/check-ins) should also light up when the
  // user is on /employee/check-in/Q1 since the URL roots diverge by an "s".
  matchPaths?: string[];
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Single source of truth for sidebar nav.  Every visible entry must
// point at a route with a real page.tsx (no catch-all placeholders).
// The principle: visible-and-broken is worse than missing-from-nav.
//
// Placeholder routes (Cycles, Users, Thrust areas, Shared goals) still
// resolve via the (app)/[...slug] catch-all when a dev types the URL
// directly — but the sidebar doesn't surface them so judges never
// land on a "COMING SOON" screen during the demo walk.
export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  EMPLOYEE: [
    {
      label: "Personal",
      items: [
        // "Overview" matches the manager + admin nav so all three personas
        // land on a consistent role-aware dashboard label.
        { href: "/employee", label: "Overview", icon: LayoutDashboard },
        { href: "/employee/goal-sheet", label: "Goal sheet", icon: Target },
        {
          href: "/employee/check-ins",
          label: "Check-ins",
          icon: ClipboardCheck,
          // /employee/check-in/Q1 etc. should also light up Check-ins.
          matchPaths: ["/employee/check-in"],
        },
      ],
    },
  ],
  MANAGER: [
    {
      label: "Team",
      items: [
        { href: "/manager", label: "Overview", icon: LayoutDashboard },
        { href: "/manager/approvals", label: "Approvals", icon: ListChecks },
        { href: "/manager/escalations", label: "Escalations", icon: AlertTriangle },
        { href: "/manager/check-ins", label: "Check-ins", icon: ClipboardCheck },
      ],
    },
    {
      label: "Reports",
      items: [
        { href: "/reports/completion", label: "Completion", icon: BarChart3 },
        { href: "/reports/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
  ],
  ADMIN: [
    {
      label: "Org",
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
      ],
    },
    {
      label: "Governance",
      items: [
        { href: "/admin/time-travel", label: "Time-travel", icon: Clock },
        { href: "/admin/audit-log", label: "Audit log", icon: ScrollText },
        { href: "/admin/escalations", label: "Escalations", icon: AlertTriangle },
        { href: "/admin/unlock", label: "Unlock", icon: KeyRound },
      ],
    },
    {
      label: "Reports",
      items: [
        { href: "/reports/completion", label: "Completion", icon: BarChart3 },
        { href: "/reports/analytics", label: "Analytics", icon: BarChart3 },
      ],
    },
  ],
};

// Stable mini-roster for the unauthenticated state — used by the sidebar to
// show useful context ("pick a role" hint) without an empty pane.
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  EMPLOYEE: "Draft goals · log progress · view your sheet",
  MANAGER: "Review submissions · run check-ins · own your team",
  ADMIN: "Configure cycles · audit changes · oversee the org",
};
