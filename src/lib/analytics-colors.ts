// Stable manager → chart-colour mapping for analytics surfaces.
//
// CRITICAL: Do NOT reorder these by score, alphabet, or anything dynamic.
// The QoQ chart, heatmap, and Manager Effectiveness all read from this so
// the same team is the same colour across every period and every refresh.
// If the colour assignment changes between Q1 and Q2, the chart silently
// lies about which team is which.
//
// Seeded managers are hard-pinned by name.  A fourth+ manager (post-seed
// growth) falls through to a deterministic hash-based slot so the chart
// still works, but seeded demos never shift colour.
//
// Palette tokens live in src/app/globals.css under @theme.

export type ChartSlot = "chart-1" | "chart-2" | "chart-3";

const SEEDED: Record<string, ChartSlot> = {
  "Karthik Iyer": "chart-1", // emerald
  "Anita Reddy":  "chart-2", // slate blue
  "Vikram Patel": "chart-3", // violet
};

const FALLBACK_ORDER: ChartSlot[] = ["chart-1", "chart-2", "chart-3"];

export function chartSlotForManager(name: string): ChartSlot {
  if (SEEDED[name]) return SEEDED[name];
  // Stable hash: same name always gets the same slot, but seeded names
  // are never overridden.
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return FALLBACK_ORDER[Math.abs(h) % FALLBACK_ORDER.length];
}

// Hex value for each slot — used by Recharts where it expects literal
// colours, not CSS custom properties.  Keep these in lock-step with the
// `--color-chart-*` tokens in globals.css.
export const CHART_HEX: Record<ChartSlot, string> = {
  "chart-1": "#0F5132",
  "chart-2": "#475569",
  "chart-3": "#7E22CE",
};
