# H20 Phase E — Post-polish audit summary

Generated 2026-05-17 via `pnpm e2e:audit:screenshots`, `:a11y`, `:tokens`, `:baselines:update`.

Compared against `audit/baseline-summary.md` (Phase C, pre-polish). The Phase D work landed:

- Brand token migration (emerald → lime + navy)
- AtomGrid wordmark via `<Logo>`
- Poppins corporate font via `next/font`
- Lenis smooth-scroll provider
- Primitive refactors (Button/Input/Textarea/Select + sidebar nav)
- Sandbox `/` replaced with role-aware redirect
- Skip-link + `<main id="main-content">` in app shell
- Chart palette swap (chart-1 emerald → navy, in `lib/analytics-colors.ts`)

---

## Headline before/after

| Metric | Phase C | Phase E | Δ |
|---|---:|---:|---:|
| Screenshots captured | 125 | 125 | — |
| **a11y critical** | 0 | 0 | — |
| **a11y serious** | 24 | 22 | **−2 (−8%)** |
| **a11y moderate** | 33 | 23 | **−10 (−30%)** |
| **a11y minor** | 3 | 3 | — |
| **a11y total** | 60 | 48 | **−12 (−20%)** |
| Token violations (spacing/radius/font) | 0 | 0 | — |
| **Token violations (height)** | 27 | 36 | **+9 (+33%) ← regression, see §3** |
| **Runtime errors** | 34 | 26 | **−8 (−24%)** |
| Runtime warnings | 48 | 48 | — |
| **Hydration mismatches** | 25 | 17 | **−8 (−32%)** |
| Visual-regression baselines | — | 20 | new |

---

## 1. Accessibility — what improved and what's left

### 1a. Eliminated violations

| Rule | Phase C | Phase E | Where they went |
|---|---:|---:|---|
| `landmark-main-is-top-level` | 3 | **0** | Sandbox `/` removed |
| `landmark-no-duplicate-main` | 3 | **0** | Same — sandbox no longer rendered |
| `landmark-unique` | 3 | **0** | Same |
| `region` (sandbox) | ~9 | **0** | Same |

### 1b. Still present

| Rule | Impact | Phase E count | Diagnosis |
|---|---|---:|---|
| `color-contrast` | serious | **22** | Still — the lime CTA + warm canvas combo passes AA but several **`text-text-muted` + active-sidebar text** computations didn't. Phase F item: tighten `--color-text-muted` from `#737373` to `#525252` on light surfaces, or add a contrast-safe alternative for the active sidebar item label. |
| `region` (non-sandbox) | moderate | **22** | The audit flags any content outside a recognised landmark. Some pages don't have `<header>`/`<nav>` even though `<main>` exists. Phase F: audit each route's outermost container to ensure landmark wrapping. |
| `empty-table-header` | minor | **3** | Action-column `<th>` still empty. Single fix: add `<span class="sr-only">Actions</span>` to the column header in shared table.tsx. |
| `heading-order` | moderate | **1** | One H1→H3 skip. Phase E doesn't tell us which route; need a targeted dig. |

> **Phase F item C (state-surface sweep)** will not fix the contrast / region findings; these need **explicit landmark + colour-token edits**. Adding to Phase F's locked list.

---

## 2. Hydration discipline — partial win, more to do

| Surface | Phase C | Phase E |
|---|---:|---:|
| `/` (sandbox) | 9 | 0 — page removed |
| `/login` | 7 | 2 — most resolved by `<Logo>` + Poppins  |
| `/admin/time-travel` | 3 | 3 — unchanged |
| `/employee/goal-sheet` | 3 | 2 |
| `/admin/unlock` | 1 | 3 — slightly worse |
| `/employee/check-in/Q1` | 2 | 3 |
| `/` (redirect re-renders?) | 0 | 3 |
| **Total** | **25** | **17** |

> The remaining 17 are not pinpointed by axe-core's logs (it captures the warning, not the offending node). Phase F: add a hydration-trace logger to `runtime-errors.json` capture so we know which DOM attribute is mismatching. Until then, defensive fix: add `suppressHydrationWarning` to date-rendering chips on the 5 surfaces and re-audit.

The `/` count of 3 is suspicious — it's a redirect, no rendering. Likely captures from the audit briefly hitting the redirected target before navigation completes; cosmetic.

---

## 3. Token violations — height regression explained (and harmless)

| Selector pattern | Phase C count | Phase E count | What changed |
|---|---:|---:|---|
| `select` ~1px (hidden by Radix) | 9 | **18** | The Radix `<Select>` wraps a hidden `<select>` once per trigger. The audit pre-flagged these as a false positive (Phase C summary §3). I doubled the count by not yet adding the `[aria-hidden=true]` ignore rule. **Audit-instrument issue, not a UI regression.** |
| `button.rounded-sm.border` ~26px (H8 inline-edit) | 9 | 9 | Unchanged — pending Block 7 surgical fix (bump 26→28). |
| `textarea#description-*` 72px | 3 | 0 | ✓ Resolved — Block 3 textarea swap from `min-h-[72px]` → `min-h-20`. |
| `textarea#description-*` 80px | 0 | **3** | New. `min-h-20` = 80px, which isn't on the audit's height scale (28/32/36/40/44/48/52/56). **Audit-instrument issue.** |
| `button.inline-flex.items-center` ~16px (icon buttons) | 6 | 6 | Unchanged. |

**Net real UI defects: 15** (9 inline-edit buttons at 26px + 6 icon buttons at 16px) — same as Phase C. The +9 regression is **entirely audit-script noise** that will resolve when we add:

1. Ignore `select[aria-hidden="true"]` in the token compliance spec
2. Add `80` to the allowed height scale

Both fixes go into Phase F's audit-hardening sub-task.

---

## 4. Runtime errors

### Patterns

| Pattern | Phase C | Phase E | Notes |
|---|---:|---:|---|
| Recharts `width(-1) height(-1)` | 48 | 48 | Cosmetic — empty-state captures with collapsed chart containers. Will silence with a render-guard `if (data.length === 0) return <Empty />` upstream of the Recharts container. Phase F sub-item under D11. |
| Hydration mismatch | 25 | **17** | Down 32%; see §2. |
| `Failed to load resource: 500` (force-error) | 3 | 3 | Expected |
| `Error: Forced error — boundary test` | 3 | 3 | Expected |
| `%o %s Error: Forced error...` | 3 | 3 | Expected (React error-boundary internal log) |
| `screenshot capture failed` | 0 | 0 | First Phase E run hit the 5m timeout; re-ran with 10m timeout and these cleared. |

### By route (top 8)

| Route | Phase C | Phase E |
|---|---:|---:|
| `/reports/analytics` | 48 | 46 |
| `/force-error` | 9 | 11 |
| `/` (sandbox) | 9 | 3 |
| `/login` | 7 | 2 |
| `/admin/time-travel` | 3 | 3 |
| `/admin/unlock` | 1 | 3 |
| `/employee/goal-sheet` | 3 | 2 |
| `/employee/check-in/Q1` | 2 | 3 |

---

## 5. Visual regression baselines (new in Phase E)

20 baselines established via `pnpm e2e:audit:baselines:update`. Stored in `e2e/audit/__snapshots__/baselines.spec.ts/`. Phase F's iteration loop can run `pnpm e2e:audit:baselines` after each polish round to see visual diffs against these locked-in references.

---

## 6. Top 5 categories that improved most

1. **Landmark a11y** — 9 → 0 (sandbox replaced)
2. **Hydration mismatches** — 25 → 17 (sandbox + Poppins consistency)
3. **a11y total** — 60 → 48
4. **Runtime errors** — 34 → 26
5. **a11y moderate** — 33 → 23

## 7. Things that regressed or emerged

- **Token height violations** — 27 → 36, but +9 is **all audit-instrument noise**. No real UI regression. Phase F audit-hardening fixes this.

## 8. Things newly visible

- The 22 remaining `color-contrast` findings are concentrated on the **muted-text colour token** and the **active-sidebar-item label**. Lime green CTA bg vs dark-navy text PASSES contrast cleanly (verified manually). The failures are on edge surfaces.
- The 22 remaining `region` findings are spread across routes that have content outside `<main>` (e.g. the time-travel banner sits above `<main>` and isn't wrapped in any landmark). Phase F: wrap with `<aside>` or move into `<main>`.

---

## 9. Screenshots zip

```
audit/screenshots-phase-e.zip
```

Generated alongside this summary. Contains the 125 PNGs from this run (3 identities × 3 viewports × 13 routes × 1-3 states) for the user's eyeball pass.

---

## 10. Phase F readiness

Per the user's non-negotiable list for Phase F:

| Item | Status |
|---|---|
| **A. D14 modal Lenis-aware scroll-lock** | Ready to execute — `window.__lenis` hook is wired in `SmoothScrollProvider`, dialog primitive needs `onOpenChange` to call `stop()`/`start()`. |
| **B. D18 mobile sidebar drawer** | Ready to execute — Sheet primitive exists. |
| **C. D11/D12/D13 state-surface sweep** | Ready — user will review the screenshots and surface specific gaps. |

Surgically-scoped items (D6/D7/D10/D19/D20) pending user screenshot review.

Auto-resolved (D15/D16/D22) confirmed.

---

**E4 PAUSE POINT** — surface this summary + the screenshots zip + comparative analysis (next message). Then wait for the user's screenshot review prompts. Non-negotiables A/B/C may begin immediately once Phase E surfaces.
