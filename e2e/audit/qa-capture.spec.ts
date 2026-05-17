import { test, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/cookie";

// QA capture pipeline for H20/H23 review.  Output layout matches the
// user's requested structure:
//   audit/qa-screenshots/{persona}/{route-slug}-{viewport}-{state}.png
//
// Console errors / warnings + failed requests are collected during the
// nav sweep and written to audit/console-errors.json.

const ROOT_DIR = path.join("audit", "qa-screenshots");
const CONSOLE_FILE = path.join("audit", "console-errors.json");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width: 375,  height: 812 },
] as const;

interface RouteCapture {
  slug:   string;
  path:   string;
  // Optional empty-state variant — query string suffix that should
  // produce a no-rows render.  Only set on routes where the empty
  // state is informative to review.
  empty?: { suffix: string; slugSuffix: string };
}

const EMPLOYEE_ROUTES: RouteCapture[] = [
  { slug: "overview",      path: "/employee" },
  { slug: "goal-sheet",    path: "/employee/goal-sheet" },
  { slug: "check-ins",     path: "/employee/check-ins" },
  { slug: "check-in-q1",   path: "/employee/check-in/Q1" },
];

const MANAGER_ROUTES: RouteCapture[] = [
  { slug: "overview",                 path: "/manager" },
  { slug: "approvals",                path: "/manager/approvals" },
  { slug: "escalations",              path: "/manager/escalations",
    empty: { suffix: "?status=DISMISSED", slugSuffix: "-empty" } },
  { slug: "check-ins",                path: "/manager/check-ins?period=Q1" },
  { slug: "completion",               path: "/reports/completion?period=Q1",
    empty: { suffix: "&manager=__none__", slugSuffix: "-empty" } },
  { slug: "analytics-qoq",            path: "/reports/analytics?period=Q1&tab=qoq" },
  { slug: "analytics-heatmap",        path: "/reports/analytics?period=Q1&tab=heatmap" },
  { slug: "analytics-distribution",   path: "/reports/analytics?period=Q1&tab=distribution" },
  { slug: "analytics-effectiveness",  path: "/reports/analytics?period=Q1&tab=effectiveness" },
];

const ADMIN_ROUTES: RouteCapture[] = [
  { slug: "overview",                 path: "/admin" },
  { slug: "time-travel",              path: "/admin/time-travel" },
  // The audit-log page filters on `?action=<AuditAction>`, not
  // `?actor=` — pointing at GOAL_DELETED (seeded zero rows) actually
  // triggers the table's filter-aware empty state instead of falling
  // through to the default capture.
  { slug: "audit-log",                path: "/admin/audit-log",
    empty: { suffix: "?action=GOAL_DELETED", slugSuffix: "-empty" } },
  { slug: "escalations",              path: "/admin/escalations",
    empty: { suffix: "?status=DISMISSED", slugSuffix: "-empty" } },
  { slug: "unlock",                   path: "/admin/unlock" },
  { slug: "completion",               path: "/reports/completion?period=Q1",
    empty: { suffix: "&manager=__none__", slugSuffix: "-empty" } },
  { slug: "analytics-qoq",            path: "/reports/analytics?period=Q1&tab=qoq" },
  { slug: "analytics-heatmap",        path: "/reports/analytics?period=Q1&tab=heatmap" },
  { slug: "analytics-distribution",   path: "/reports/analytics?period=Q1&tab=distribution" },
  { slug: "analytics-effectiveness",  path: "/reports/analytics?period=Q1&tab=effectiveness" },
];

interface ConsoleEvent {
  persona:  string;
  url:      string;
  viewport: string;
  level:    "error" | "warning" | "network";
  message:  string;
}

const consoleEvents: ConsoleEvent[] = [];

async function capturePersona(
  page: import("@playwright/test").Page,
  identityEmail: string,
  personaName: "employee" | "manager" | "admin",
  routes: RouteCapture[],
) {
  const outDir = path.join(ROOT_DIR, personaName);
  fs.mkdirSync(outDir, { recursive: true });

  await loginAs(page, identityEmail);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of routes) {
      await captureSingle(page, personaName, vp.name, route.path, route.slug, outDir);
      if (route.empty) {
        // Suffix the URL.  If the path already has a `?`, the empty
        // suffix already starts with `&`; otherwise it starts with `?`.
        const url = route.path + route.empty.suffix;
        await captureSingle(page, personaName, vp.name, url, route.slug + route.empty.slugSuffix, outDir);
      }
    }
  }
}

async function captureSingle(
  page: import("@playwright/test").Page,
  persona: string,
  viewport: string,
  url: string,
  slug: string,
  outDir: string,
) {
  const onConsole = (msg: ConsoleMessage) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      consoleEvents.push({
        persona, url, viewport,
        level:   msg.type() === "error" ? "error" : "warning",
        message: msg.text(),
      });
    }
  };
  const onPageError = (err: Error) => {
    consoleEvents.push({
      persona, url, viewport, level: "error",
      message: err.message,
    });
  };
  const onReqFailed = (req: import("@playwright/test").Request) => {
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    consoleEvents.push({
      persona, url, viewport, level: "network",
      message: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "failed"}`,
    });
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  page.on("requestfailed", onReqFailed);

  try {
    await page.goto(url);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
    const filename = `${slug}-${viewport}-default.png`;
    await page.screenshot({ path: path.join(outDir, filename), fullPage: true });
  } catch (err) {
    consoleEvents.push({
      persona, url, viewport, level: "error",
      message: `capture failed: ${String(err)}`,
    });
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    page.off("requestfailed", onReqFailed);
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(900_000);

test("qa capture — employee", async ({ page }) => {
  await capturePersona(page, "emp@demo", "employee", EMPLOYEE_ROUTES);
});

test("qa capture — manager", async ({ page }) => {
  await capturePersona(page, "mgr@demo", "manager", MANAGER_ROUTES);
});

test("qa capture — admin", async ({ page }) => {
  await capturePersona(page, "admin@demo", "admin", ADMIN_ROUTES);
});

test("qa capture — write console-errors.json", async () => {
  fs.writeFileSync(CONSOLE_FILE, JSON.stringify(consoleEvents, null, 2));
  console.log(`[qa-capture] wrote ${consoleEvents.length} console events to ${CONSOLE_FILE}`);
});
