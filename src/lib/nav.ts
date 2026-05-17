import {
  AlertTriangle,
  BarChart3,
  Calendar,
  ClipboardCheck,
  Clock,
  Compass,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Share2,
  Target,
  UserCog,
  Users,
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

// Single source of truth for sidebar nav.  Routes that don't yet exist fall
// through to the (app)/[...slug] catch-all stub until H7+ builds them out.
export const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  EMPLOYEE: [
    {
      label: "Personal",
      items: [
        { href: "/employee", label: "Home", icon: LayoutDashboard },
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
        { href: "/manager/shared-goals", label: "Shared goals", icon: Share2 },
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
        { href: "/admin/cycles", label: "Cycles", icon: Calendar },
        { href: "/admin/users", label: "Users", icon: UserCog },
        { href: "/admin/thrust-areas", label: "Thrust areas", icon: Compass },
        { href: "/admin/shared-goals", label: "Shared goals", icon: Share2 },
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
