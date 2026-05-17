import { test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/cookie";
import { IDENTITIES, ROUTES, expandRoute } from "./routes";

// Phase B3 — token-compliance scan.  For every interactive element
// (button, a, input, select, textarea, [role=button], [role=link])
// on every route, capture computed padding, font-size, border-radius
// and check membership against the design scales pinned in
// src/app/globals.css.  Surfaces in audit/token-violations.json
// grouped by category so post-polish (Phase E) we can verify zero
// off-scale values.

const REPORT_FILE = path.join("audit", "token-violations.json");

// Pinned scales — kept in this file so the spec is self-contained.
// Mirror src/app/globals.css after Phase D rewires tokens; today the
// portal uses these as the working baseline.
interface Scales {
  spacing:  number[];
  radius:   number[];
  fontSize: number[];
  height:   number[];
}
const SCALES: Scales = {
  // Spacing values that are allowed.  Padding/margin must land here.
  spacing:  [0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96, 128],
  // Border radii.
  radius:   [0, 2, 4, 6, 8, 10, 12, 16, 9999],
  // Font sizes allowed.
  fontSize: [11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 40, 48],
  // Heights — interactive controls must be on one of these.
  // 80 added in Phase F to cover the goal-description textarea's
  // min-h-20 (Block 3 swap from arbitrary [72px]).  Textareas use
  // the same scale as controls so the audit can flag any other
  // arbitrary px values that drift in.
  height:   [28, 32, 36, 40, 44, 48, 52, 56, 64, 72, 80, 96, 128],
};

interface Violation {
  identity:  string;
  url:       string;
  selector:  string;
  rule:      "spacing" | "radius" | "fontSize" | "height";
  property:  string;
  value:     string;
  parsedPx:  number | null;
  textHint:  string;
}

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test("token compliance — interactive element audit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const violations: Violation[] = [];

  for (const ident of IDENTITIES) {
    await loginAs(page, ident.email);
    for (const route of ROUTES) {
      if (route.skipTokenAudit)                            continue;
      if (route.roles && !route.roles.includes(ident.role)) continue;

      for (const variant of expandRoute(route)) {
        await page.goto(variant.url);
        await page.waitForLoadState("domcontentloaded");

        const found = await page.evaluate((scalesArg) => {
          const SELECTORS = "button, a[href], input, textarea, select, [role=button], [role=link]";
          const out: Array<{
            selector: string;
            property: string;
            value:    string;
            parsedPx: number | null;
            textHint: string;
            rule:     string;
          }> = [];

          // Stringly-typed view of the scales — Playwright serialises
          // tuples to arrays so the type assertion below is for our
          // editor only.
          const scales = scalesArg as {
            spacing: number[]; radius: number[]; fontSize: number[]; height: number[];
          };

          const elements = Array.from(document.querySelectorAll<HTMLElement>(SELECTORS));
          for (const el of elements) {
            if (el.offsetParent === null && el.tagName !== "DIALOG") continue; // hidden
            // Radix Select wraps a 1×1 hidden native <select> behind
            // its custom popover trigger.  The hidden select carries
            // aria-hidden="true"; skip it so the audit doesn't keep
            // flagging the 9× false-positive seen in Phase C/E.
            if (el.tagName === "SELECT" && el.getAttribute("aria-hidden") === "true") continue;

            const cs       = window.getComputedStyle(el);
            const textHint = (el.textContent ?? "").trim().slice(0, 40) || `<${el.tagName.toLowerCase()}>`;
            const sel      = describeSelector(el);

            const check = (
              prop: string,
              raw:  string,
              rule: "spacing" | "radius" | "fontSize" | "height",
              allowed: number[],
            ) => {
              const px = parseFloat(raw);
              if (Number.isNaN(px)) return;
              if (allowed.includes(Math.round(px))) return;
              // Sub-pixel rounding tolerance (browsers compute 36.16px
              // from h-9 + scaled rem).  Anything within 1px of an
              // allowed value passes.
              if (allowed.some((a) => Math.abs(a - px) <= 1.0)) return;
              out.push({ selector: sel, property: prop, value: raw, parsedPx: px, textHint, rule });
            };

            // Padding (per side — measured separately so an off
            // value on one side surfaces).
            for (const side of ["padding-top", "padding-right", "padding-bottom", "padding-left"]) {
              check(side, cs.getPropertyValue(side), "spacing", scales.spacing);
            }
            // Margin doesn't apply to all controls — skip; auditing
            // padding catches most off-scale CTAs.

            // Border radius — only one corner reported (top-left)
            // since most components use uniform corners.
            check("border-top-left-radius", cs.getPropertyValue("border-top-left-radius"), "radius", scales.radius);

            // Font-size.
            check("font-size", cs.getPropertyValue("font-size"), "fontSize", scales.fontSize);

            // Height — only check on buttons/inputs/textareas (links
            // can be inline so heights are intrinsic).
            const isControl = ["BUTTON", "INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
            if (isControl) {
              const h = el.getBoundingClientRect().height;
              if (h > 0) {
                check("height", `${h}px`, "height", scales.height);
              }
            }

            // Raw-colour tracing is intentionally out of scope here.
            // getComputedStyle always returns resolved rgb(), so
            // there's no way at this layer to tell whether the
            // resolution came from a CSS var.  A future pass could
            // cross-check against a known palette; today we focus on
            // off-scale spacing/radius/font/height which are concrete.
          }

          function describeSelector(el: Element): string {
            const tag = el.tagName.toLowerCase();
            const id  = el.id ? `#${el.id}` : "";
            const cls = (el as HTMLElement).className && typeof (el as HTMLElement).className === "string"
              ? "." + (el as HTMLElement).className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")
              : "";
            return `${tag}${id}${cls}`;
          }

          return out;
        }, SCALES);

        for (const f of found) {
          violations.push({
            identity: ident.label,
            url:      variant.url,
            selector: f.selector,
            rule:     f.rule as Violation["rule"],
            property: f.property,
            value:    f.value,
            parsedPx: f.parsedPx,
            textHint: f.textHint,
          });
        }
      }
    }
  }

  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(violations, null, 2));

  // Group by rule for the console summary.
  const byRule: Record<string, number> = {};
  for (const v of violations) {
    byRule[v.rule] = (byRule[v.rule] ?? 0) + 1;
  }
  console.log("[audit/token-compliance] counts by rule:", byRule);
  console.log(`[audit/token-compliance] full report at ${REPORT_FILE}`);
});
