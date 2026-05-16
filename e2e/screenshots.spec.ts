import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "./helpers/cookie";

interface Identity {
  email: string;
  label: string; // folder name under screenshots/<ts>/
}

interface Route {
  path: string;
  label: string;
}

// Six identities — three anointed demo users (used by the role-switcher
// header dropdown) plus three more that exercise specific goal-sheet
// states the seed sets up:
//   sanjay — DRAFT with sum=80 (live validation as the user nudges to 100)
//   aditya — SUBMITTED, waiting on the manager
//   kavya  — fresh, no seeded sheet → editor creates an empty DRAFT on first hit
const IDENTITIES: Identity[] = [
  { email: "admin@demo",  label: "admin-priya" },
  { email: "mgr@demo",    label: "manager-karthik" },
  { email: "emp@demo",    label: "employee-riya" },
  { email: "sanjay@demo", label: "employee-sanjay" },
  { email: "aditya@demo", label: "employee-aditya" },
  { email: "kavya@demo",  label: "employee-kavya" },
];

const ROUTES: Route[] = [
  { path: "/",                    label: "home" },
  { path: "/employee/goal-sheet", label: "goal-sheet" },
  { path: "/manager/approvals",   label: "approvals-queue" },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile",  width: 375,  height: 812 },
];

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const baseDir = path.join("test-results", "screenshots", stamp);

test.describe.configure({ mode: "serial" });

test("screenshots", async ({ page }) => {
  for (const ident of IDENTITIES) {
    await loginAs(page, ident.email);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of ROUTES) {
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        const dir = path.join(baseDir, ident.label, viewport.name);
        fs.mkdirSync(dir, { recursive: true });
        await page.screenshot({
          path: path.join(dir, `${route.label}.png`),
          fullPage: true,
        });
      }
    }
  }
  console.log(`Screenshots written to ${baseDir}`);
});
