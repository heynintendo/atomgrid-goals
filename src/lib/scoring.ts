// Pure score-computation library — no Prisma, no React, isomorphic between
// client (live form preview) and server (saveCheckIn action + CSV export).
//
// One function per UoM type per the BRD's Section 5 formula, returning a
// uniform ScoreResult so the rest of the app doesn't need to switch on
// uomType when rendering.

import { differenceInCalendarDays } from "date-fns";

export type UomType = "MIN" | "MAX" | "TIMELINE" | "ZERO";

export type ScoreInput =
  | { uomType: "MIN"; target: number; actual: number }
  | { uomType: "MAX"; target: number; actual: number }
  | { uomType: "TIMELINE"; targetDate: Date; actualDate: Date }
  | { uomType: "ZERO"; achieved: boolean };

export type ScoreBand = "BELOW" | "MEETS" | "EXCEEDS" | "NA";

export interface ScoreResult {
  score: number;   // 0..1, clamped — used for stored computedScore + banding
  raw: number;     // unclamped ratio for analytics drilldowns
  display: string; // human label rendered next to the goal row
  banded: ScoreBand;
}

const MEETS_FLOOR = 0.7; // BELOW < 0.7 ≤ MEETS < 1.0 ≤ EXCEEDS

function band(score: number): ScoreBand {
  if (Number.isNaN(score)) return "NA";
  if (score >= 1) return "EXCEEDS";
  if (score >= MEETS_FLOOR) return "MEETS";
  return "BELOW";
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function computeScore(input: ScoreInput): ScoreResult {
  switch (input.uomType) {
    case "MIN": {
      // Higher is better: achievement / target.  Target=0 has no defined
      // ratio so we surface N/A rather than infinity.
      if (input.target === 0) {
        return { score: 0, raw: 0, display: "N/A (target = 0)", banded: "NA" };
      }
      const raw = input.actual / input.target;
      const score = clamp01(raw);
      return { score, raw, display: pct(raw), banded: band(score) };
    }
    case "MAX": {
      // Lower is better: target / achievement.  Two edges:
      //   - actual=0: achieved better than any positive target → score 1.
      //   - target=0: undefined band.
      if (input.target === 0) {
        return {
          score: input.actual === 0 ? 1 : 0,
          raw: input.actual === 0 ? 1 : 0,
          display: input.actual === 0 ? "Held at zero" : "Above zero target",
          banded: input.actual === 0 ? "EXCEEDS" : "BELOW",
        };
      }
      if (input.actual === 0) {
        return { score: 1, raw: 1, display: "Exceeded (held at 0)", banded: "EXCEEDS" };
      }
      const raw = input.target / input.actual;
      const score = clamp01(raw);
      return { score, raw, display: pct(raw), banded: band(score) };
    }
    case "TIMELINE": {
      // On-time or earlier = 1.0.  Each day late costs 1/30 (linear slope —
      // BRD is silent, pick a defensible slope).  Clamped at 0.
      const diff = differenceInCalendarDays(input.actualDate, input.targetDate);
      if (diff <= 0) {
        const score = 1;
        const display =
          diff === 0 ? "On time" : `Early by ${Math.abs(diff)} day${diff === -1 ? "" : "s"}`;
        return { score, raw: 1, display, banded: "EXCEEDS" };
      }
      const raw = 1 - diff / 30;
      const score = clamp01(raw);
      return {
        score,
        raw,
        display: `${diff} day${diff === 1 ? "" : "s"} late`,
        banded: band(score),
      };
    }
    case "ZERO": {
      // BRD: actual === 0 → 100%, else 0%.  Boolean input matches the
      // CheckIn.zeroAchieved schema field.
      if (input.achieved) {
        return {
          score: 1,
          raw: 1,
          display: "Achieved (0)",
          banded: "EXCEEDS",
        };
      }
      return { score: 0, raw: 0, display: "Not achieved", banded: "BELOW" };
    }
  }
}
