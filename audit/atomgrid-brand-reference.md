# AtomGrid Brand Reference

Extracted from https://atomgrid.in via `e2e/brand-recon.spec.ts` on 2026-05-17. Hex values below are computed via `getComputedStyle()` on the live site — not eyeballed from screenshots.

Raw data: `audit/atomgrid-reference/_raw.json` (per-page samples) + `_navy-recon.json` (dominant dark surfaces). Full-page screenshots at desktop + mobile in the same directory.

---

## Colors (computed from atomgrid.in)

### Primary lime green family
Two distinct greens exist on the site. Worth keeping both as separate tokens so the logo mark and the CTA buttons stay visually consistent with the corporate brand.

| Token              | Hex       | Source on atomgrid.in                                            |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--brand-primary`  | `#A4D845` | Contact Us button background, active filter chip border + text   |
| `--brand-logo`     | `#94C240` | `fill` on the logo's main vector path (slightly darker, more saturated) |

> The CTA green is lighter than the logo mark green. Most marketing sites do this — the logo reads as the saturated brand mark and CTA buttons sit slightly lighter for accessibility against text. Recommend wiring `--brand-primary = #A4D845` as the working CTA colour and using `#94C240` only inside the logo SVG (which is already self-contained).

### Dark navy
Dominant dark surface, covers ~880,000 px² of the home page (hero + footer wrapper).

| Token              | Hex       | Source                                                          |
| ------------------ | --------- | --------------------------------------------------------------- |
| `--brand-navy`     | `#23416F` | Hero gradient base, footer wrapper, header dark sections        |

### Text colours
| Token              | Hex       | Use                                                              |
| ------------------ | --------- | ---------------------------------------------------------------- |
| `--text-on-primary`| `#242424` | Text on lime-green CTA buttons (NOT white — confirms contrast rule) |
| `--text-on-navy`   | `#FFFFFF` | Text on `--brand-navy` surfaces                                  |
| `--text-primary`   | `#000000` | Headings on white surfaces (pure black per atomgrid.in)          |
| `--text-secondary` | `#777777` | Body / paragraph text on white surfaces                          |

### Filter chips (outline pattern)
| State    | Border    | Text      | Background      |
| -------- | --------- | --------- | --------------- |
| Active   | `#A4D845` | `#A4D845` | transparent     |
| Inactive | `#000000` | `#000000` | transparent     |

Same radius (10px) + padding (6px 28px) across both states; only colour shifts. We can mirror this pattern in `/reports/analytics`'s tab indicators and any filter UI we add.

---

## Typography

| Property              | Value                              |
| --------------------- | ---------------------------------- |
| Font family           | `Poppins, sans-serif`              |
| Body weight           | 500                                |
| Heading weight        | 600                                |
| Body font-size        | 17.6px (1.1rem)                    |
| Heading sizes         | 32px (about/products/capabilities), 40px (home), 50px (industries) |
| Body line-height      | 28.16px (1.6 ratio)                |
| Heading line-height   | ~56px on 40px = 1.4 ratio          |
| Letter-spacing        | normal — no tracking applied       |
| Text-transform        | none — sentence case throughout    |

> **Font notable**: Poppins, not Inter / Geist. Generally rounder/friendlier than Inter — gives atomgrid.in a less "tech-bro" feel and more "industrial brand" feel. If we adopt Poppins for AtomGrid Goals it'll cost ~12KB compressed (next/font/google) but the brand match is worth it. Alternatively, keep Geist Sans (already loaded) — pragmatic call. Recommend Poppins for brand fidelity.

---

## Buttons (Contact Us as reference)

| Property         | Value                                  |
| ---------------- | -------------------------------------- |
| Border radius    | **10px** (not 28px — the visual roundness comes from height + padding, not radius) |
| Padding          | 12px 20px (vertical horizontal)        |
| Height (rendered)| 52px @ 17.6px font + 12px padding      |
| Font size        | 17.6px                                 |
| Font weight      | 500                                    |
| Box shadow       | **none** — flat design, no elevation   |
| Border           | 1px solid `#242424` (subtle dark edge) |
| Text colour      | `#242424` (dark) — never white         |
| Background       | `#A4D845`                              |
| Text-transform   | none                                   |

> Buttons are big — 52px tall — so the lg variant in our spec (h-11 = 44px) should grow to **h-13 (52px)** or we accept a slightly tighter feel.
> The border + flat design pattern is interesting — we currently use shadow-button-primary. The atomgrid.in look is flatter. Recommend dropping shadows on primary buttons in this polish pass to match.

---

## Smooth scrolling

| Property            | Value                                                           |
| ------------------- | --------------------------------------------------------------- |
| Library             | **Lenis** (confirmed)                                           |
| Version detected    | `0.2.28` (studio-freight CDN bundle)                            |
| Globals             | `window.Lenis` resolves at runtime                              |
| Configuration       | Not extractable via script — site uses bundled init             |
| Our integration     | The H20 spec already calls for Lenis + a 1.2 duration. Stick with that; tune upward if it doesn't match the feel. |

> The CDN URL is `https://cdn.jsdelivr.net/gh/studio-freight/lenis@0.2.28/bundled/lenis.js`. We'll install via `pnpm add lenis` instead (newer version, proper module).

---

## Logo

| Property         | Value                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| Source           | `https://cdn.prod.website-files.com/6711ee34884bcc699b488ff8/679b689817de25ac517679b9_Group%2027.svg` |
| Saved to         | `audit/atomgrid-reference/logo.svg` (10.7 KB, valid SVG)                                       |
| Format           | SVG                                                                                            |
| Native viewBox   | 1597 × 301 (long wordmark + icon, ~5.3 : 1 aspect ratio)                                      |
| Rendered size on home (desktop) | 160 × 30 (header)                                                              |
| Internal fill    | `#94C240` (the logo green, slightly darker than the CTA green)                                 |

> For the Phase D integration, copy `audit/atomgrid-reference/logo.svg` to `public/atomgrid-logo.svg`. Use a `<Logo />` wrapper that renders `<img>` for body content (cleaner cache) and inlines the SVG via `<svg>` in the email template (email clients block remote images by default — inlining beats hot-linking the CDN). Favicon needs a square variant; SVG won't crop cleanly from the wordmark. Recommend extracting just the icon path (the `<path>` with `fill="#94C240"`) into a separate `public/atomgrid-icon.svg` for the favicon — I can write a quick crop spec on the next pass if you want.

---

## Notable gaps + recommendations

1. **Two greens**: keep them separate. Logo uses `#94C240`, CTAs use `#A4D845`. Don't unify.
2. **No prominent border colour on atomgrid.in** — the site uses transparent backgrounds + spacing for separation. Our portal needs functional borders for tables/cards. Recommend `--border-default = #E5E5E5` per the H20 spec; document that this is a "portal addition," not from corporate.
3. **No shadow elevations on atomgrid.in** — site is flat. Our portal needs shadows for popovers/modals (functional, not stylistic). Recommend the Linear-style multi-layer shadow scale from H20.D3 stays, but **primary buttons drop their shadow** to match corporate.
4. **Poppins vs Geist**: brand fidelity recommends Poppins; engineering pragmatism recommends Geist (already loaded). Your call.
5. **Font sizes are LARGER than typical SaaS** (17.6px body vs our 14px) — atomgrid.in is a marketing site that needs scannability. Our portal is data-dense and benefits from tighter 14px body. Recommend NOT bumping our body to 17.6px; use Poppins (or Geist) but keep the 14/16px portal scale.

---

## Visual reference

Screenshots captured (full-page, both viewports):

- `audit/atomgrid-reference/home-desktop.png` (4.5 MB) — hero + sections
- `audit/atomgrid-reference/home-mobile.png` (1.9 MB) — mobile layout
- `audit/atomgrid-reference/about-desktop.png`, `about-mobile.png`
- `audit/atomgrid-reference/products-desktop.png`, `products-mobile.png`
- `audit/atomgrid-reference/capabilities-desktop.png`, `capabilities-mobile.png`
- `audit/atomgrid-reference/industries-desktop.png`, `industries-mobile.png` (small — `/industries` route may be sparse or redirect-only on the live site; flag if relevant)

---

## Proposed token mapping (for Phase D approval)

If you sign off, Phase D applies these replacements:

```css
/* AtomGrid brand — extracted from atomgrid.in */
--brand-primary:         #A4D845;   /* CTA background, active filter accent */
--brand-primary-hover:   #93C53B;   /* slightly darker — derived, not extracted */
--brand-primary-subtle:  rgba(164, 216, 69, 0.10);
--brand-navy:            #23416F;   /* hero + footer wrapper on atomgrid.in */
--brand-navy-subtle:     rgba(35, 65, 111, 0.10);
--brand-logo:            #94C240;   /* embedded in logo SVG only — not for general UI */

--text-on-primary:       #242424;   /* dark text on lime CTA — never white */
--text-on-navy:          #FFFFFF;
```

Hover and subtle variants are derived (I picked them by hand to fit the H20 spec) — happy to extract from the actual site if you have a route where Contact Us renders its hover state idle.
