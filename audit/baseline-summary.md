# H20 Phase C — Baseline audit summary

Generated 2026-05-17 via `pnpm e2e:audit:screenshots`, `pnpm e2e:audit:a11y`, `pnpm e2e:audit:tokens`. Raw artifacts in `audit/`:

| File | Contents |
|---|---|
| `audit/screenshots/{identity}/{viewport}/...` | 125 PNGs across 3 identities × 3 viewports × 13 routes × 2–4 states |
| `audit/runtime-errors.json` | 82 runtime issues captured during screenshot pass |
| `audit/a11y-report.json` | axe-core findings grouped by route + identity |
| `audit/token-violations.json` | computed-style scan flagging off-scale values |

---

## 1. Screenshot capture

| Metric | Value |
|---|---|
| Total screenshots written | **125** |
| Identities | admin-priya, manager-karthik, employee-riya |
| Viewports | desktop 1440×900, tablet 768×1024, mobile 375×812 |
| States captured | default, empty (best-effort), loading (desktop), error (`/force-error` once) |

---

## 2. Accessibility (axe-core)

| Severity | Count | Status |
|---|---|---|
| **critical** | **0** | clean already |
| **serious** | **24** | all are `color-contrast` — single root cause |
| **moderate** | **33** | landmarks + heading order — structural |
| **minor** | **3** | empty table headers |

**60 findings total across 13 routes × 3 identities.**

### Top violations by occurrence

| Rule | Impact | Count | What it means |
|---|---|---|---|
| `color-contrast` | serious | **24** | Text or borders fail WCAG AA contrast — almost certainly the existing emerald `#0F5132` on the warm canvas `#FBFAF7`, plus several `text-text-muted` cases. **Phase D's brand swap to `#A4D845` + navy `#23416F` headings will resolve most of these in one move.** |
| `region` | moderate | **23** | Content outside `<main>`/`<nav>`/`<header>` landmarks. Worst offender is the `/` sandbox page which doesn't use the app shell. |
| `landmark-main-is-top-level` | moderate | 3 | `<main>` nested inside another landmark on 3 routes. |
| `landmark-no-duplicate-main` | moderate | 3 | More than one `<main>` on a page. |
| `landmark-unique` | moderate | 3 | Multiple landmarks with the same accessible name. |
| `empty-table-header` | minor | 3 | A `<th>` has no text — usually the action-column header. |
| `heading-order` | moderate | 1 | H1 → H3 skip detected once. |

> **Root-cause read**: the 24 contrast hits and ~9 of the 33 moderate landmark hits are concentrated structural issues, not 60 distinct problems. Three Phase D fixes (brand swap, landmark cleanup on `/`, action-column `<th>` aria-labels) will close out ≥50 of the 60.

---

## 3. Token compliance

| Rule | Violations |
|---|---|
| `spacing` | **0** ✓ |
| `radius` | **0** ✓ |
| `fontSize` | **0** ✓ |
| `height` | **27** ← only category with hits |

### Distinct height offenders

| Selector pattern | Measured | Count | Notes |
|---|---|---|---|
| `button.rounded-sm.border` | ~26px | 9 | Small inline buttons (likely manager-edit inline-weightage chips on H8 sheet review) rendering 2px shy of the `28` scale. Easy fix: bump to `h-7` (28px). |
| `select` | ~1px | 9 | Hidden `<select>` elements (Radix wraps natives at 1×1 and stacks the custom popover over them). False positive of the audit — the visible Radix trigger renders at 36px. Add `select[aria-hidden="true"]` to the audit's ignore list. |
| `button.inline-flex.items-center` | ~16px | 6 | Icon-only mini buttons in approve-edit cards. Should be sized to one of `28/32/36` or explicitly `h-4`-style decorative-icon. |
| `textarea#description-*.min-h-[72px]` | 72px | 3 | Goal-description textareas. Either add `72` to the audit's height scale or relax to `min-h-16` (64px). Arbitrary `[72px]` value is the actual smell. |

> **Sub-pixel rounding tolerance is ±1px**, so the 26px-button reports are real (2px shy), not rounding artefacts.

---

## 4. Runtime errors during capture

| Level | Count |
|---|---|
| `error`   | 34 |
| `warning` | 48 |
| **Total** | **82** |

### By route (top 8)

| Route | Count | Pattern |
|---|---|---|
| `/reports/analytics` | 48 | Recharts `width(-1) height(-1)` warnings in the **empty-state** captures — `?period=...` queries that yielded zero data points let ResponsiveContainer collapse to 0px. Inert; suppressible. |
| `/` | 9 | Hydration mismatches on the H2 sandbox page (date formatting, `toLocaleString`). |
| `/force-error` | 9 | Expected — deliberate error-boundary route. Three `Error: Forced error — boundary test` + 3 status-500 fetch fails + 3 hydration noise. |
| `/login` | 7 | Hydration mismatches — login page's demo-identity buttons render a date pill that drifts between server (en-US) and client (en-IN). |
| `/admin/time-travel` | 3 | Hydration on the system-date pill. |
| `/employee/goal-sheet` | 3 | Hydration on save-timestamp. |
| `/employee/check-in/Q1` | 2 | Hydration on the period-window banner. |
| `/admin/unlock` | 1 | Hydration on the search-bar placeholder. |

### Top error patterns

| Count | Pattern | Severity |
|---|---|---|
| 48 | `The width(-1) and height(-1) of chart should be greater than 0` | warning — Recharts in empty state; cosmetic |
| 25 | `A tree hydrated but some attributes of the server rendered HTML didn't match the client` | **real** — Phase D needs to nail down date/locale rendering |
| 3 | `Failed to load resource: the server responded with a status of 500` | expected (force-error) |
| 3 | `Error: Forced error — boundary test. Remove before deploy.` | expected (force-error) |

> **The 25 hydration mismatches are the only honest runtime issue in this run.** Phase D should pin all `toLocaleString`/`Intl` calls to a fixed locale OR mark the date-rendering containers `suppressHydrationWarning` consistently. Today some are pinned and some aren't.

---

## 5. What Phase D needs to land

Inferred priority order, mapping each Phase C finding to a Phase D subtask:

1. **D1 — brand colour migration** closes the 24 color-contrast hits. Lime green CTA + dark navy headings + adjusted `text-secondary` will all pass AA in one swap.
2. **D17 — landmark + heading hierarchy** fixes the 33 moderate findings. Audit each page for one `<main>`, proper landmark nesting, sequential heading levels.
3. **D7 — table empty-th** fixes the 3 minor findings. Add `<span class="sr-only">Actions</span>` to action-column headers.
4. **Hydration discipline** — not called out in the original Phase D outline; add a sub-bullet to D21 (microcopy) covering date/locale rendering consistency. 25 mismatches concentrated in 5 surfaces.
5. **D4 — button sizing audit** fixes the 27 token height violations. Inline-edit chips bump from 26 → 28px, icon-buttons land on `h-7/h-8/h-9`.
6. **Audit hardening** — add `select[aria-hidden]` ignore + add `72` to allowed heights OR change textareas. One-line edit in `token-compliance.spec.ts`.

Phase C produced **no critical findings** in any category. The portal is structurally sound; Phase D is genuinely cosmetic + a11y polish, not bug-fixing.

---

## 6. Notes on running `pnpm e2e:audit`

- The `baselines.spec.ts` was deliberately skipped in this run — those tests fail on first execution because snapshots don't exist yet. Phase E will run them as a regression check **after** Phase D writes the polished snapshots via `pnpm e2e:audit:baselines:update`.
- Wall-clock cost for this baseline run: **~5 minutes** (screenshots 3.7m + a11y 42s + tokens 36s). Faster than the 10-20m I estimated — auth.js sessions cache nicely across identities.

---

**C3 PAUSE POINT** — review this summary, the four raw JSON artifacts, and a sampling of screenshots under `audit/screenshots/`. Sign off and I move to Phase D (the actual polish work).
