import type { ScoreBand } from "@/lib/scoring";

// Single source of truth for "what colour does this score get on screen?"
// — consumed by ScorePill (band → discrete Tailwind classes) and by the
// analytics heatmap (band → base hex it can blend with an alpha curve).
// The bug specifically being guarded against is the two surfaces drifting:
// e.g., a 65% pill rendering muted-neutral in the dashboard but red in
// the heatmap.  Both routes pass through this module.

export type ScoreBucket = ScoreBand | "NOT_APPLICABLE";

export interface ScoreColorTokens {
  bucket:  ScoreBucket;
  // Tailwind class strings — used when the consumer renders a fixed-opacity
  // surface (ScorePill dot, status chip, etc).
  bg:      string;
  fg:      string;
  border:  string;
  // Raw hex of the bucket's canonical colour.  Used by surfaces that need
  // to apply a dynamic alpha (heatmap) or pass the colour to a non-CSS
  // consumer (Recharts).  Kept in lock-step with the corresponding token
  // in globals.css — if you ever change `--color-danger` or `--color-brand`
  // you must change the hex here too.
  baseHex: string;
  // Human label shown in tooltips and a11y announcements.  Lives here so
  // every consumer says the same thing.
  label:   string;
}

const TOKENS: Record<ScoreBucket, ScoreColorTokens> = {
  BELOW: {
    bucket:  "BELOW",
    bg:      "bg-danger",
    fg:      "text-danger",
    border:  "border-danger",
    baseHex: "#B91C1C",
    label:   "Below",
  },
  MEETS: {
    bucket:  "MEETS",
    bg:      "bg-text-muted",
    fg:      "text-text",
    border:  "border-border",
    baseHex: "#8A8680",
    label:   "Meets",
  },
  EXCEEDS: {
    bucket:  "EXCEEDS",
    bg:      "bg-brand",
    fg:      "text-brand",
    border:  "border-brand",
    baseHex: "#0F5132",
    label:   "Exceeds",
  },
  NA: {
    bucket:  "NA",
    bg:      "bg-text-placeholder",
    fg:      "text-text-muted",
    border:  "border-border",
    baseHex: "#A8A39A",
    label:   "Not computable",
  },
  NOT_APPLICABLE: {
    bucket:  "NOT_APPLICABLE",
    bg:      "bg-surface-hover",
    fg:      "text-text-muted",
    border:  "border-border",
    baseHex: "#E8E5DF",
    label:   "Not applicable",
  },
};

// Returns the canonical tokens for a score.  `null` is treated as
// NOT_APPLICABLE — the surface decides what to render (em-dash in the
// heatmap, hidden in ScorePill which receives band directly).
export function scoreColorTokens(score: number | null): ScoreColorTokens {
  if (score == null || !Number.isFinite(score)) return TOKENS.NOT_APPLICABLE;
  if (score >= 1)   return TOKENS.EXCEEDS;
  if (score >= 0.7) return TOKENS.MEETS;
  return TOKENS.BELOW;
}

// Same tokens, but for callsites that already have a discrete band (e.g.
// ScorePill consuming a computeScore() result).  Delegates to the same
// table so the two paths can't disagree.
export function bandColorTokens(band: ScoreBand): ScoreColorTokens {
  return TOKENS[band];
}
