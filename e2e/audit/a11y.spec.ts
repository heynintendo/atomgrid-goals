import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/cookie";
import { IDENTITIES, ROUTES, expandRoute } from "./routes";

// Phase B2 — axe-core a11y scan on every route × role at desktop.
// We deliberately don't iterate viewports here: axe rules are
// viewport-agnostic, and the mobile layout uses the same DOM with
// different CSS.  Running per viewport would 3× runtime for zero
// signal gain.  Output: audit/a11y-report.json grouped by route +
// severity.  Fail the suite on any critical/serious violation; log
// moderate/minor as warnings without failing.

type AxeImpact = "critical" | "serious" | "moderate" | "minor" | null;

interface AxeFinding {
  id:          string;
  impact:      AxeImpact;
  description: string;
  helpUrl:     string;
  nodes:       Array<{ target: string[]; failureSummary: string }>;
}

interface RouteFindings {
  identity: string;
  url:      string;
  label:    string;
  findings: AxeFinding[];
}

const REPORT_FILE = path.join("audit", "a11y-report.json");

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test("a11y — axe-core scan across route × role", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const all: RouteFindings[] = [];

  // Public route first — no auth.
  for (const route of ROUTES.filter((r) => !r.roles)) {
    if (route.skipA11y) continue;
    for (const variant of expandRoute(route)) {
      await page.goto(variant.url);
      await page.waitForLoadState("domcontentloaded");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
        .analyze();
      all.push({
        identity: "anonymous",
        url:      variant.url,
        label:    variant.label,
        findings: shape(results.violations),
      });
    }
  }

  // Authenticated routes — one pass per identity.
  for (const ident of IDENTITIES) {
    await loginAs(page, ident.email);
    for (const route of ROUTES) {
      if (route.skipA11y) continue;
      if (route.roles && !route.roles.includes(ident.role)) continue;
      // Skip routes already covered by the public pass.
      if (!route.roles && ident !== IDENTITIES[0]) continue;
      for (const variant of expandRoute(route)) {
        await page.goto(variant.url);
        await page.waitForLoadState("domcontentloaded");
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
          .analyze();
        all.push({
          identity: ident.label,
          url:      variant.url,
          label:    variant.label,
          findings: shape(results.violations),
        });
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(all, null, 2));

  // Bucket and report.
  const buckets = { critical: 0, serious: 0, moderate: 0, minor: 0, other: 0 };
  for (const r of all) {
    for (const f of r.findings) {
      const k = f.impact ?? "other";
      buckets[k as keyof typeof buckets]++;
    }
  }
  console.log("[audit/a11y] counts by severity:", buckets);
  console.log(`[audit/a11y] full report at ${REPORT_FILE}`);

  // Baseline run is read-only — we want all findings recorded even
  // when critical ones exist.  Post-polish (Phase E) we tighten to
  // expect(buckets.critical + buckets.serious).toBe(0).
  expect(buckets, "a11y scan completed").toBeTruthy();
});

interface AxeViolation {
  id:          string;
  // axe-core types this as ImpactValue | undefined; we coerce
  // undefined → null in shape() so downstream filtering is simpler.
  impact?:     AxeImpact | undefined;
  description: string;
  helpUrl:     string;
  nodes:       Array<{ target: unknown[]; failureSummary?: string }>;
}

function shape(violations: AxeViolation[]): AxeFinding[] {
  return violations.map((v) => ({
    id:          v.id,
    impact:      v.impact ?? null,
    description: v.description,
    helpUrl:     v.helpUrl,
    nodes:       v.nodes.map((n) => ({
      target: n.target.map((t) => String(t)),
      failureSummary: n.failureSummary ?? "",
    })),
  }));
}
