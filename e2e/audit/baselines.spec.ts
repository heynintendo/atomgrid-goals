import { test, expect } from "@playwright/test";
import { loginAs } from "../helpers/cookie";
import { IDENTITIES, ROUTES, expandRoute } from "./routes";

// Phase B5 — Playwright visual-regression baselines for the routes
// flagged with `baseline: true` in routes.ts.  On the first run
// Playwright writes the baseline PNGs under e2e/audit/__snapshots__.
// Subsequent runs compare the live page against the baseline and
// fail on visual drift.
//
// Run with --update-snapshots to re-baseline after intentional polish
// changes (Phase D).  The post-polish run will overwrite baselines
// and become the new floor.
//
// We intentionally cap to desktop here — visual regression on three
// viewports triples the snapshot maintenance burden and judges only
// see desktop in the demo URL.

const PIXEL_DIFF_THRESHOLD = 0.01; // 1% — generous, accounts for font hinting jitter

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

for (const ident of IDENTITIES) {
  for (const route of ROUTES) {
    if (!route.baseline) continue;
    if (route.roles && !route.roles.includes(ident.role)) continue;

    for (const variant of expandRoute(route)) {
      test(`baseline · ${ident.label} · ${variant.label}`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await loginAs(page, ident.email);
        await page.goto(variant.url);
        await page.waitForLoadState("domcontentloaded");
        // Settle: let server components stream + any client effects.
        await page.waitForTimeout(800);
        await expect(page).toHaveScreenshot(
          `${ident.label}-${variant.label}.png`,
          {
            fullPage:       true,
            maxDiffPixelRatio: PIXEL_DIFF_THRESHOLD,
            animations:     "disabled",
          },
        );
      });
    }
  }
}

// Public route (no identity) — login surface.
const loginRoute = ROUTES.find((r) => r.path === "/login");
if (loginRoute?.baseline) {
  test("baseline · anonymous · login", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(800);
    await expect(page).toHaveScreenshot("anonymous-login.png", {
      fullPage: true,
      maxDiffPixelRatio: PIXEL_DIFF_THRESHOLD,
      animations: "disabled",
    });
  });
}
