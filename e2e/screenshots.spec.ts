import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { DEMO_USERS, setRole, type DemoRole } from "./helpers/auth";

interface Route {
  path: string;
  label: string;
  roles: DemoRole[];
}

// Grows as H7+ features land.  Today the shell is the only landed surface.
const ROUTES: Route[] = [
  { path: "/", label: "home", roles: ["employee", "manager", "admin"] },
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 375, height: 812 },
];

// Timestamp suffix → successive runs land in their own folder so I can diff
// H6 vs H7 vs H8 visually without overwriting.
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const baseDir = path.join("test-results", "screenshots", stamp);

test.describe.configure({ mode: "serial" });

test("screenshots", async ({ page }) => {
  for (const role of Object.keys(DEMO_USERS) as DemoRole[]) {
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/");
      await setRole(page, role);

      for (const route of ROUTES) {
        if (!route.roles.includes(role)) continue;
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        const dir = path.join(baseDir, role, viewport.name);
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
