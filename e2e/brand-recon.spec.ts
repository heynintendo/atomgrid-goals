// One-off Phase A reconnaissance — extracts atomgrid.in brand tokens.
// Not part of the regular audit suite (`pnpm e2e:audit` does not run it).
// Kept in-tree to document the methodology that produced
// audit/atomgrid-brand-reference.md, in case a future polish round
// needs to re-extract from the live corporate site.
//
// Run on demand: `pnpm exec playwright test e2e/brand-recon.spec.ts`

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Phase A — extract brand identity from atomgrid.in.
// Output: audit/atomgrid-reference/ (PNGs + raw JSON).
// Compiled markdown report is written by the run-driver after the
// spec completes.

const REFERENCE_DIR = path.join("audit", "atomgrid-reference");
const PAGES = [
  { path: "/",             slug: "home" },
  { path: "/about-us",     slug: "about" },
  { path: "/products",     slug: "products" },
  { path: "/industries",   slug: "industries" },
  { path: "/capabilities", slug: "capabilities" },
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900  },
  { name: "mobile",  width: 375,  height: 812  },
];

interface ComputedStyleSample {
  // The query that resolved (so debugging knows which fallback hit).
  selector:        string | null;
  textContent:     string | null;
  // null when the element wasn't found.
  styles:          Record<string, string> | null;
  // bounding box for sanity-checking we found the right thing.
  boundingBox:     { x: number; y: number; width: number; height: number } | null;
}

interface PageReport {
  page:           string;
  loadedAt:       string;
  smoothScroll:   {
    libraryHints: string[];                  // ["lenis", "locomotive", ...]
    bodyClasses:  string;
    bodyAttrs:    Record<string, string>;
    scriptSrcs:   string[];                  // external scripts that hint at smooth-scroll libs
  };
  samples:        Record<string, ComputedStyleSample>;
  // Logo info — captured once, on the home page only.
  logo?: {
    nodeType:    "img" | "svg" | "unknown";
    imgSrc?:     string;       // absolute URL when nodeType=img
    svgMarkup?:  string;       // outerHTML when nodeType=svg
    boundingBox: { x: number; y: number; width: number; height: number } | null;
  };
}

// Properties we care about per surface — the spec writes the union to
// keep the run-driver flexible.
const STYLE_PROPS = [
  "background-color", "color", "border-color", "border-top-color",
  "border-bottom-color", "border-radius", "padding", "padding-top",
  "padding-right", "padding-bottom", "padding-left",
  "font-family", "font-size", "font-weight", "letter-spacing",
  "line-height", "box-shadow", "text-transform",
] as const;

// A list of "try-each" selector candidates per logical surface.  First
// match wins — used because atomgrid.in's source HTML is unknown.
const SURFACES: Record<string, string[]> = {
  primaryCta: [
    'header a:has-text("Contact Us")',
    'a:has-text("Contact Us")',
    'header button:has-text("Contact")',
    'a[href*="contact"]',
  ],
  heading: [
    "main h1",
    "section h1",
    "h1",
    "main h2",
    "h2",
  ],
  bodyText: [
    "main p:not(:empty)",
    "section p:not(:empty)",
    "p:not(:empty)",
  ],
  filterChipActive: [
    'button.active:has-text("Ankleshwar")',
    'a.active:has-text("Ankleshwar")',
    'button:has-text("Ankleshwar")',
    'a:has-text("Ankleshwar")',
  ],
  filterChipInactive: [
    'button:has-text("Dahej")',
    'a:has-text("Dahej")',
    'button:has-text("Sachin")',
    'a:has-text("Sachin")',
  ],
  footer: [
    "footer",
    '[class*="footer"]',
  ],
  footerHeading: [
    "footer h1, footer h2, footer h3, footer h4",
    "footer [class*='heading']",
  ],
  link: [
    "main a:not([class])",
    "section a:not([class])",
    "a[href]",
  ],
};

async function sampleSurface(
  page: import("@playwright/test").Page,
  selectors: string[],
): Promise<ComputedStyleSample> {
  for (const selector of selectors) {
    try {
      const handle = await page.$(selector);
      if (!handle) continue;
      const styles = await handle.evaluate((el, props) => {
        const cs = window.getComputedStyle(el);
        const result: Record<string, string> = {};
        for (const p of props as readonly string[]) {
          result[p] = cs.getPropertyValue(p);
        }
        return result;
      }, STYLE_PROPS);
      const textContent  = (await handle.textContent())?.trim().slice(0, 80) ?? null;
      const boundingBox  = await handle.boundingBox();
      return { selector, textContent, styles, boundingBox };
    } catch {
      // Selector syntax error or element no longer in DOM — try next.
    }
  }
  return { selector: null, textContent: null, styles: null, boundingBox: null };
}

// Looks for a recognisable logo element in the page header.  Returns
// markup + bounding box when found, null otherwise.
async function extractLogo(
  page: import("@playwright/test").Page,
): Promise<PageReport["logo"]> {
  const logoInfo = await page.evaluate(() => {
    // Try a few common patterns: <a class="logo">, <header><img>, link
    // to /, header-area <svg>.
    const candidates: Element[] = [];
    const root = document.querySelector("header") ?? document.body;

    const linkToHome = root.querySelector('a[href="/"]');
    if (linkToHome) candidates.push(linkToHome);
    const logoClass = root.querySelector('[class*="logo" i]');
    if (logoClass) candidates.push(logoClass);
    candidates.push(...Array.from(root.querySelectorAll("svg")).slice(0, 3));
    candidates.push(...Array.from(root.querySelectorAll("img")).slice(0, 5));

    for (const c of candidates) {
      const img = c.tagName === "IMG"
        ? (c as HTMLImageElement)
        : (c.querySelector("img") as HTMLImageElement | null);
      const svg = c.tagName === "SVG"
        ? (c as SVGSVGElement)
        : (c.querySelector("svg") as SVGSVGElement | null);
      if (img && img.src) {
        const r = img.getBoundingClientRect();
        return {
          nodeType: "img" as const,
          imgSrc:   img.src,
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
        };
      }
      if (svg) {
        const r = svg.getBoundingClientRect();
        return {
          nodeType: "svg" as const,
          svgMarkup: svg.outerHTML,
          boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
        };
      }
    }
    return null;
  });
  return logoInfo ?? undefined;
}

async function detectSmoothScroll(
  page: import("@playwright/test").Page,
): Promise<PageReport["smoothScroll"]> {
  return page.evaluate(() => {
    const hints: string[] = [];
    type LenisWin = Window & {
      Lenis?: unknown; lenis?: unknown; LocomotiveScroll?: unknown;
      gsap?: unknown; ScrollSmoother?: unknown;
    };
    const w = window as LenisWin;
    if (w.Lenis || w.lenis)        hints.push("lenis-global");
    if (w.LocomotiveScroll)        hints.push("locomotive-global");
    if (w.gsap || w.ScrollSmoother) hints.push("gsap/scroll-smoother");

    const scriptSrcs: string[] = [];
    document.querySelectorAll("script[src]").forEach((s) => {
      const src = (s as HTMLScriptElement).src;
      if (/lenis|locomotive|smooth-scroll|gsap|scrollsmoother/i.test(src)) {
        scriptSrcs.push(src);
      }
    });

    const bodyAttrs: Record<string, string> = {};
    for (const a of Array.from(document.body.attributes)) {
      if (a.name.startsWith("data-")) bodyAttrs[a.name] = a.value;
    }

    if (/has-scroll-smooth/.test(document.documentElement.className)
        || /has-scroll-smooth/.test(document.body.className)) {
      hints.push("locomotive-class");
    }
    if (bodyAttrs["data-lenis-prevent"] != null
        || document.documentElement.getAttribute("data-lenis-prevent") != null) {
      hints.push("lenis-attr");
    }

    return {
      libraryHints: hints,
      bodyClasses:  document.body.className,
      bodyAttrs,
      scriptSrcs,
    };
  });
}

test.describe.configure({ mode: "serial" });
test.setTimeout(120_000);

test("brand recon — atomgrid.in", async ({ browser }) => {
  fs.mkdirSync(REFERENCE_DIR, { recursive: true });

  const reports: PageReport[] = [];

  // One persistent context so we hit the site behind a consistent UA.
  const context = await browser.newContext({
    viewport:        { width: 1440, height: 900 },
    userAgent:       "Mozilla/5.0 AtomGrid-BrandRecon/1.0 Playwright",
    extraHTTPHeaders: { "Accept-Language": "en-IN,en;q=0.9" },
  });
  const page = await context.newPage();

  for (const target of PAGES) {
    const url = `https://atomgrid.in${target.path}`;
    console.log(`[brand-recon] ${url}`);

    let smoothScroll: PageReport["smoothScroll"] | null = null;
    let logo:         PageReport["logo"]         | undefined;
    let desktopSamples: Record<string, ComputedStyleSample> = {};

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      } catch (err) {
        console.warn(`  ${target.slug}:${vp.name} navigation failed`, err);
        continue;
      }
      // Let the page settle — many marketing sites lazy-load fonts +
      // hero imagery.  3s upper bound keeps the run finite.
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.screenshot({
        path:     path.join(REFERENCE_DIR, `${target.slug}-${vp.name}.png`),
        fullPage: true,
      });

      if (vp.name === "desktop") {
        // Capture all the per-surface samples on desktop — most of our
        // tokens come from the wider layout.
        for (const [key, selectors] of Object.entries(SURFACES)) {
          desktopSamples[key] = await sampleSurface(page, selectors);
        }
        if (target.slug === "home") {
          smoothScroll = await detectSmoothScroll(page);
          logo         = await extractLogo(page);
        }
      }
    }

    reports.push({
      page:         target.path,
      loadedAt:     new Date().toISOString(),
      smoothScroll: smoothScroll ?? {
        libraryHints: [], bodyClasses: "", bodyAttrs: {}, scriptSrcs: [],
      },
      samples: desktopSamples,
      logo,
    });
  }

  // Persist the raw JSON for the run-driver to compile into markdown.
  fs.writeFileSync(
    path.join(REFERENCE_DIR, "_raw.json"),
    JSON.stringify(reports, null, 2),
  );

  // If we found a logo image, download it so the markdown can reference
  // a local path.
  const homeReport = reports.find((r) => r.page === "/");
  if (homeReport?.logo?.nodeType === "img" && homeReport.logo.imgSrc) {
    try {
      const resp = await page.context().request.get(homeReport.logo.imgSrc);
      if (resp.ok()) {
        const ext = (homeReport.logo.imgSrc.match(/\.(svg|png|jpg|jpeg|webp)(\?|$)/i)?.[1] ?? "png").toLowerCase();
        fs.writeFileSync(
          path.join(REFERENCE_DIR, `logo.${ext}`),
          await resp.body(),
        );
      }
    } catch (err) {
      console.warn("logo download failed", err);
    }
  } else if (homeReport?.logo?.nodeType === "svg" && homeReport.logo.svgMarkup) {
    fs.writeFileSync(
      path.join(REFERENCE_DIR, "logo.svg"),
      homeReport.logo.svgMarkup,
    );
  }

  await context.close();
  // Smoke assertion — at least one page should have returned a primary-
  // CTA sample with a background colour we can later parse.
  const anyCta = reports.find((r) => r.samples.primaryCta?.styles?.["background-color"]);
  expect(anyCta).toBeTruthy();
});
