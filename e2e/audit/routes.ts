// Shared route catalog for the Phase B audit suite.  One file so the
// screenshot, a11y, token-compliance, and runtime-error specs all
// agree on which URLs to visit.

export type RoleKey = "admin" | "manager" | "employee";

export interface RouteDef {
  path:        string;
  // Stable filename slug for output artifacts.
  label:       string;
  // When set, the route runs only for matching identities.  Public
  // routes (like /login) leave this undefined.
  roles?:      RoleKey[];
  // Skip certain audit phases per-route — e.g. /force-error is a
  // deliberate crash route, no a11y meaningful, no token compliance.
  skipA11y?:        boolean;
  skipTokenAudit?:  boolean;
  // If true, the route is a critical surface and gets a
  // Playwright toHaveScreenshot() baseline for visual regression.
  baseline?:        boolean;
  // Variants — alternate query strings worth capturing separately
  // (e.g. analytics tabs).  Each variant becomes its own file.
  variants?: Array<{ qs: string; label: string }>;
}

export const ROUTES: RouteDef[] = [
  // ── Public ─────────────────────────────────────────────────────
  { path: "/login",  label: "login", baseline: true },

  // ── Employee ───────────────────────────────────────────────────
  { path: "/",                              label: "home",            baseline: true },
  { path: "/employee/goal-sheet",           label: "goal-sheet",      roles: ["employee"], baseline: true },
  { path: "/employee/check-ins",            label: "check-ins-index", roles: ["employee"] },
  { path: "/employee/check-in/Q1",          label: "check-in-q1",     roles: ["employee"] },

  // ── Manager ────────────────────────────────────────────────────
  { path: "/manager/approvals",             label: "approvals",       roles: ["manager"], baseline: true },
  { path: "/manager/check-ins?period=Q1",   label: "team-checkins",   roles: ["manager"] },
  { path: "/manager/escalations",           label: "team-escalations",roles: ["manager"] },

  // ── Admin ──────────────────────────────────────────────────────
  { path: "/admin/audit-log",               label: "audit-log",       roles: ["admin"], baseline: true },
  { path: "/admin/escalations",             label: "admin-escalations", roles: ["admin"] },
  { path: "/admin/time-travel",             label: "time-travel",     roles: ["admin"] },
  { path: "/admin/unlock",                  label: "admin-unlock",    roles: ["admin"] },

  // ── Reports (manager + admin) ──────────────────────────────────
  { path: "/reports/completion?period=Q1",  label: "completion",      roles: ["admin", "manager"], baseline: true },
  {
    path:     "/reports/analytics",
    label:    "analytics",
    roles:    ["admin", "manager"],
    baseline: true,
    variants: [
      { qs: "?period=Q1&tab=qoq",          label: "analytics-qoq" },
      { qs: "?period=Q1&tab=heatmap",      label: "analytics-heatmap" },
      { qs: "?period=Q1&tab=distribution", label: "analytics-distribution" },
      { qs: "?period=Q1&tab=effectiveness", label: "analytics-effectiveness" },
    ],
  },
];

export const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet",  width: 768,  height: 1024 },
  { name: "mobile",  width: 375,  height: 812 },
] as const;

// One demo identity per role.  The audit uses these to log in and
// then visit each route's role-gated variant.
export const IDENTITIES: Array<{ email: string; role: RoleKey; label: string }> = [
  { email: "admin@demo", role: "admin",    label: "admin-priya"     },
  { email: "mgr@demo",   role: "manager",  label: "manager-karthik" },
  { email: "emp@demo",   role: "employee", label: "employee-riya"   },
];

// Expand a route into the concrete (url, label) pairs to visit —
// includes its variants when defined.
export function expandRoute(r: RouteDef): Array<{ url: string; label: string }> {
  if (!r.variants || r.variants.length === 0) {
    return [{ url: r.path, label: r.label }];
  }
  return r.variants.map((v) => ({ url: `${r.path}${v.qs}`, label: v.label }));
}
