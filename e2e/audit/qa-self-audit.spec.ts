import { test, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/cookie";

// Final self-audit before H22 — captures the admin + manager routes
// listed in the H23 spec, attaches console listeners, writes a small
// per-route report so a human (or this spec's runner) can score
// against the 5-point checklist.
//
// Output:
//   audit/self-audit/{persona}/{slug}-{viewport}.png
//   audit/self-audit/_console.json

const OUT = path.join("audit", "self-audit");
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile",  width: 375,  height: 812 },
] as const;

interface Route { slug: string; path: string }

const ADMIN_ROUTES: Route[] = [
  { slug: "overview",                 path: "/admin" },
  { slug: "time-travel",              path: "/admin/time-travel" },
  { slug: "escalations",              path: "/admin/escalations" },
  { slug: "escalations-resolved",     path: "/admin/escalations?status=RESOLVED" },
  { slug: "unlock",                   path: "/admin/unlock" },
  { slug: "completion",               path: "/reports/completion?period=Q1" },
  { slug: "completion-empty",         path: "/reports/completion?period=Q1&manager=__none__" },
];

const MANAGER_ROUTES: Route[] = [
  { slug: "overview",                 path: "/manager" },
  { slug: "approvals",                path: "/manager/approvals" },
  { slug: "escalations",              path: "/manager/escalations" },
  { slug: "escalations-empty",        path: "/manager/escalations?status=DISMISSED" },
  { slug: "check-ins",                path: "/manager/check-ins?period=Q1" },
  { slug: "completion",               path: "/reports/completion?period=Q1" },
  { slug: "analytics-qoq",            path: "/reports/analytics?period=Q1&tab=qoq" },
  { slug: "analytics-heatmap",        path: "/reports/analytics?period=Q1&tab=heatmap" },
  { slug: "analytics-distribution",   path: "/reports/analytics?period=Q1&tab=distribution" },
  { slug: "analytics-effectiveness",  path: "/reports/analytics?period=Q1&tab=effectiveness" },
];

interface ConsoleEvent {
  persona:  string;
  slug:     string;
  viewport: string;
  level:    "error" | "warning" | "network";
  message:  string;
}

const consoleEvents: ConsoleEvent[] = [];

async function capturePersona(
  page: import("@playwright/test").Page,
  identity: string,
  persona: "admin" | "manager",
  routes: Route[],
) {
  const dir = path.join(OUT, persona);
  fs.mkdirSync(dir, { recursive: true });
  await loginAs(page, identity);

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of routes) {
      const onConsole = (m: ConsoleMessage) => {
        if (m.type() === "error" || m.type() === "warning") {
          consoleEvents.push({
            persona, slug: route.slug, viewport: vp.name,
            level: m.type() === "error" ? "error" : "warning",
            message: m.text(),
          });
        }
      };
      const onPageErr = (err: Error) => {
        consoleEvents.push({
          persona, slug: route.slug, viewport: vp.name,
          level: "error", message: err.message,
        });
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageErr);

      try {
        await page.goto(route.path);
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(dir, `${route.slug}-${vp.name}.png`),
          fullPage: true,
        });
      } catch (err) {
        consoleEvents.push({
          persona, slug: route.slug, viewport: vp.name,
          level: "error", message: `capture failed: ${String(err)}`,
        });
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageErr);
      }
    }
  }
}

test.describe.configure({ mode: "serial" });
test.setTimeout(900_000);

test("self-audit admin", async ({ page }) => {
  await capturePersona(page, "admin@demo", "admin", ADMIN_ROUTES);
});

test("self-audit manager", async ({ page }) => {
  await capturePersona(page, "mgr@demo", "manager", MANAGER_ROUTES);
});

test("self-audit write console-events", async () => {
  fs.writeFileSync(path.join(OUT, "_console.json"), JSON.stringify(consoleEvents, null, 2));
  console.log(`[qa-self-audit] ${consoleEvents.length} console events recorded`);
});
