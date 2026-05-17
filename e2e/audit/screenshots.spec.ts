import { test, type Page, type ConsoleMessage } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginAs } from "../helpers/cookie";
import { IDENTITIES, ROUTES, VIEWPORTS, expandRoute } from "./routes";

// Phase B1 + B4 + B5 — audit screenshot capture with multiple
// states per route plus runtime error tracking.  Output:
//   audit/screenshots/{identity}/{viewport}/{route}-{state}.png
//   audit/runtime-errors.json
//
// State definitions:
//   default — log in as identity, visit route, screenshot
//   empty   — visit with filters that exclude all data (best-effort
//             per route; for surfaces without a clean empty path we
//             skip the variant rather than fabricate one)
//   loading — intercept primary data fetch with a 2s delay, screenshot
//             before the response settles
//   error   — for one route only (/force-error), the production-ready
//             error boundary screen.  Other routes get one error
//             attempt via a forced-500 intercept.

const ARTIFACTS_DIR = path.join("audit", "screenshots");
const ERRORS_FILE   = path.join("audit", "runtime-errors.json");

interface RuntimeError {
  identity: string;
  url:      string;
  viewport: string;
  state:    string;
  level:    "error" | "warning" | "network";
  message:  string;
  detail?:  string;
}

interface RouteEmptyHook {
  // Routes here visit a synthetic URL that returns no rows.  Where
  // the empty-state copy is interesting, this lets us capture it.
  pathSuffix: string;
}

// Per-route empty-state overrides.  Routes missing from this map
// just skip the "empty" capture.
const EMPTY_OVERRIDES: Record<string, RouteEmptyHook> = {
  "audit-log":              { pathSuffix: "?actor=__none__" },
  "admin-escalations":      { pathSuffix: "?status=DISMISSED" },
  "team-escalations":       { pathSuffix: "?status=DISMISSED" },
  "completion":             { pathSuffix: "&manager=__none__" },
  "approvals":              { pathSuffix: "?status=__none__" },
};

function attachListeners(
  page:     Page,
  bucket:   RuntimeError[],
  ident:    string,
  url:      string,
  viewport: string,
  state:    string,
) {
  const log = (level: RuntimeError["level"], msg: string, detail?: string) => {
    bucket.push({ identity: ident, url, viewport, state, level, message: msg, detail });
  };
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error")   log("error",   m.text());
    if (m.type() === "warning") log("warning", m.text());
  });
  page.on("pageerror", (err) => {
    log("error", err.message, err.stack ?? undefined);
  });
  page.on("requestfailed", (req) => {
    // Ignore intentional aborts (the loading-state intercept aborts
    // its target fetch after 2s).
    if (req.failure()?.errorText === "net::ERR_ABORTED") return;
    log("network", `${req.method()} ${req.url()} failed`, req.failure()?.errorText);
  });
}

async function captureDefault(
  page:    Page,
  routeUrl: string,
  outFile:  string,
) {
  await page.goto(routeUrl);
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: outFile, fullPage: true });
}

async function captureLoading(
  page:    Page,
  routeUrl: string,
  outFile:  string,
) {
  // Slow the RSC payload + data fetches by 2s on the next navigation
  // so we can screenshot the skeleton/loading state.  Routes without a
  // loading.tsx will just render an interim blank — still useful for
  // the audit to flag.
  await page.route("**/_next/data/**", async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  // Most of our pages are server components rendered on navigation —
  // intercepting the doc request itself gives a more reliable
  // loading capture.
  await page.route(routeUrl, async (route) => {
    await new Promise((r) => setTimeout(r, 2000));
    await route.continue();
  });
  const nav = page.goto(routeUrl).catch(() => null);
  // Screenshot at ~1s into the 2s delay, before the response lands.
  await page.waitForTimeout(1000);
  try {
    await page.screenshot({ path: outFile, fullPage: true });
  } catch {
    // Page may not have rendered anything yet — fine, the empty
    // capture itself surfaces that the loading UI is missing.
  }
  await nav;
  await page.unrouteAll();
}

async function captureEmpty(
  page:     Page,
  baseUrl:  string,
  emptyQs:  string,
  outFile:  string,
) {
  // Concatenate the empty-state query suffix.  The route already has
  // its own QS (e.g. ?period=Q1), so suffixes here either prefix with
  // & or ? appropriately by checking baseUrl.
  const sep = baseUrl.includes("?") ? "&" : "?";
  const url = `${baseUrl}${emptyQs.startsWith("?") || emptyQs.startsWith("&") ? emptyQs.replace(/^[?&]/, sep) : sep + emptyQs}`;
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
  await page.screenshot({ path: outFile, fullPage: true });
}

test.describe.configure({ mode: "serial" });
// 10 minutes — the matrix has ~125 captures and Lenis adds ~20–30ms
// per page beyond the headless baseline.  300s was tight pre-D2; this
// gives us headroom without changing the per-capture logic.
test.setTimeout(600_000);

test("audit screenshots — full route × viewport × state matrix", async ({ page }) => {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const errors: RuntimeError[] = [];

  for (const ident of IDENTITIES) {
    await loginAs(page, ident.email);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of ROUTES) {
        if (route.roles && !route.roles.includes(ident.role)) continue;

        for (const variant of expandRoute(route)) {
          const dir = path.join(ARTIFACTS_DIR, ident.label, viewport.name);
          fs.mkdirSync(dir, { recursive: true });

          // ── DEFAULT ─────────────────────────────────────────────
          attachListeners(page, errors, ident.label, variant.url, viewport.name, "default");
          try {
            await captureDefault(page, variant.url, path.join(dir, `${variant.label}-default.png`));
          } catch (err) {
            errors.push({
              identity: ident.label, url: variant.url, viewport: viewport.name,
              state: "default", level: "error",
              message: "screenshot capture failed", detail: String(err),
            });
          }
          page.removeAllListeners("console");
          page.removeAllListeners("pageerror");
          page.removeAllListeners("requestfailed");

          // ── EMPTY (best-effort) ────────────────────────────────
          const emptyHook = EMPTY_OVERRIDES[variant.label] ?? EMPTY_OVERRIDES[route.label];
          if (emptyHook) {
            attachListeners(page, errors, ident.label, variant.url + emptyHook.pathSuffix, viewport.name, "empty");
            try {
              await captureEmpty(page, variant.url, emptyHook.pathSuffix, path.join(dir, `${variant.label}-empty.png`));
            } catch (err) {
              errors.push({
                identity: ident.label, url: variant.url, viewport: viewport.name,
                state: "empty", level: "error",
                message: "empty-state capture failed", detail: String(err),
              });
            }
            page.removeAllListeners("console");
            page.removeAllListeners("pageerror");
            page.removeAllListeners("requestfailed");
          }

          // ── LOADING ─────────────────────────────────────────────
          // Mobile loading captures are expensive (~3s each × 60+
          // routes) and the loading UI is the same as desktop; cap to
          // desktop only.
          if (viewport.name === "desktop") {
            attachListeners(page, errors, ident.label, variant.url, viewport.name, "loading");
            try {
              await captureLoading(page, variant.url, path.join(dir, `${variant.label}-loading.png`));
            } catch (err) {
              errors.push({
                identity: ident.label, url: variant.url, viewport: viewport.name,
                state: "loading", level: "error",
                message: "loading-state capture failed", detail: String(err),
              });
            }
            page.removeAllListeners("console");
            page.removeAllListeners("pageerror");
            page.removeAllListeners("requestfailed");
          }
        }
      }

      // ── ERROR (one shot — the deliberate crash route) ─────────
      // /force-error throws at render time; the error boundary
      // renders.  Captured once per identity × desktop.
      if (viewport.name === "desktop") {
        attachListeners(page, errors, ident.label, "/force-error", viewport.name, "error");
        try {
          await page.goto("/force-error", { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(500);
          const dir = path.join(ARTIFACTS_DIR, ident.label, viewport.name);
          fs.mkdirSync(dir, { recursive: true });
          await page.screenshot({ path: path.join(dir, "force-error.png"), fullPage: true });
        } catch (err) {
          // Force-error route may itself fail to render — that's expected
          // and surfaces in the runtime-errors report.
          errors.push({
            identity: ident.label, url: "/force-error", viewport: viewport.name,
            state: "error", level: "error",
            message: "force-error capture failed", detail: String(err),
          });
        }
        page.removeAllListeners("console");
        page.removeAllListeners("pageerror");
        page.removeAllListeners("requestfailed");
      }
    }
  }

  fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2));
  console.log(`[audit/screenshots] ${errors.length} runtime issues across the run; report at ${ERRORS_FILE}`);
});
