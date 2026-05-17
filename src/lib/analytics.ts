import "server-only";

import { CheckInPeriod, Role } from "@prisma/client";
import { bandFor, loadCompletionScope } from "@/lib/completion";
import { averageScore, type ScoreBand } from "@/lib/scoring";

const PERIODS: CheckInPeriod[] = ["Q1", "Q2", "Q3", "ANNUAL"];

export interface TeamPeriodAvg {
  managerId: string;
  managerName: string;
  avgScore: number | null; // raw (un-capped) team mean for the period
  employeeCount: number;   // scored employees that fed into the mean
}

export interface QoQDataPoint {
  period: CheckInPeriod;
  teams: Map<string, TeamPeriodAvg>; // keyed by managerId
}

export interface QoQDataset {
  // Periods in fixed order Q1 → ANNUAL.  Each contains zero or more
  // per-team averages.  Teams may be missing from a period when none of
  // their employees had a scorable check-in for that quarter.
  points: QoQDataPoint[];
  // Every manager who has at least one employee in scope, regardless of
  // whether they had scorable check-ins for any period.  Sorted by name
  // for stable rendering order; chart colour assignment is still keyed
  // by name via chartSlotForManager.
  teams: { id: string; name: string }[];
}

// Builds the per-team, per-period averages for the QoQ chart.  Hits
// loadCompletionScope 4 times (one per period) so the same scope rules
// the dashboard uses apply automatically — admin sees all teams; manager
// sees only their own.  Employee count is bounded (12 in the seed) so
// 4 round-trips is fine.
export async function loadQoQDataset(
  user: { id: string; role: Role },
): Promise<QoQDataset> {
  const allManagers = new Map<string, string>(); // managerId → name

  const points: QoQDataPoint[] = [];
  for (const period of PERIODS) {
    const scope = await loadCompletionScope(user, period);
    if (!scope) {
      points.push({ period, teams: new Map() });
      continue;
    }
    // Surface managers seen even when their team has no scored rows for
    // this period — keeps the team list complete across the whole chart.
    for (const r of scope.rows) {
      if (r.managerId && r.managerName) {
        allManagers.set(r.managerId, r.managerName);
      }
    }
    // Group scored rows by manager and average them.  Un-capped: if any
    // employee on a team had a 102% goal, the team mean reflects it.
    const byManager = new Map<string, { name: string; scores: number[] }>();
    for (const r of scope.rows) {
      if (!r.managerId || !r.managerName) continue;
      if (r.avgScore == null) continue;
      const bucket = byManager.get(r.managerId) ?? {
        name: r.managerName,
        scores: [],
      };
      bucket.scores.push(r.avgScore);
      byManager.set(r.managerId, bucket);
    }
    const teamMap = new Map<string, TeamPeriodAvg>();
    for (const [managerId, { name, scores }] of byManager) {
      const avg =
        scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
      teamMap.set(managerId, {
        managerId,
        managerName: name,
        avgScore: avg,
        employeeCount: scores.length,
      });
    }
    points.push({ period, teams: teamMap });
  }

  const teams = [...allManagers.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { points, teams };
}

// ─────────────────────────────  HEATMAP  ───────────────────────────────────

export type HeatmapCellState =
  | "NO_SHEET"        // sheet not approved/locked — check-in window doesn't apply
  | "NOT_SUBMITTED"   // sheet approved but employee hasn't logged anything yet
  | "SCORED";         // score is a real number

export interface HeatmapCell {
  score: number | null;     // raw (un-capped) average; null when state != SCORED
  state: HeatmapCellState;
}

export interface HeatmapEmployee {
  id:        string;
  name:      string;
  managerId: string | null;
  cells:     Record<CheckInPeriod, HeatmapCell>;
}

export interface HeatmapDataset {
  employees:  HeatmapEmployee[];
  hasAnyData: boolean;  // false → render the empty-state card
}

// Builds the employee × period score matrix for the heatmap.  Like
// loadQoQDataset this calls loadCompletionScope once per period so the
// caller's scope (admin = org, manager = own reports) is enforced
// without re-deriving the rules here.  The 4× round-trip is bounded by
// the seed (≤12 employees) and never re-fetches the same row.
export async function loadHeatmapDataset(
  user: { id: string; role: Role },
): Promise<HeatmapDataset | null> {
  // Map<employeeId, HeatmapEmployee> — built by merging the 4 period scans.
  const byEmployee = new Map<string, HeatmapEmployee>();
  let hasAnyData = false;
  let firstScopeReturnedNull = false;

  for (const period of PERIODS) {
    const scope = await loadCompletionScope(user, period);
    if (!scope) {
      firstScopeReturnedNull = true;
      continue;
    }
    for (const r of scope.rows) {
      const existing = byEmployee.get(r.employeeId) ?? {
        id:        r.employeeId,
        name:      r.employeeName,
        managerId: r.managerId,
        cells: {
          Q1:     { score: null, state: "NO_SHEET" },
          Q2:     { score: null, state: "NO_SHEET" },
          Q3:     { score: null, state: "NO_SHEET" },
          ANNUAL: { score: null, state: "NO_SHEET" },
        },
      } satisfies HeatmapEmployee;

      let state: HeatmapCellState;
      if (r.checkInState === "NOT_APPLICABLE") {
        state = "NO_SHEET";
      } else if (r.avgScore == null) {
        state = "NOT_SUBMITTED";
      } else {
        state = "SCORED";
        hasAnyData = true;
      }
      existing.cells[period] = { score: r.avgScore, state };
      byEmployee.set(r.employeeId, existing);
    }
  }

  // If every period returned null (no active cycle), there's nothing to
  // show — surface null so the caller renders the parent "no active cycle"
  // empty state rather than an empty grid.
  if (firstScopeReturnedNull && byEmployee.size === 0) return null;

  const employees = [...byEmployee.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return { employees, hasAnyData };
}

// ─────────────────────────────  DISTRIBUTION  ──────────────────────────────

export type DistributionBand = Extract<ScoreBand, "BELOW" | "MEETS" | "EXCEEDS">;

export interface DistributionBucket {
  band:        DistributionBand;
  count:       number;
  pctOfScored: number; // 0..100, share of scoredCount (not totalInScope)
}

export interface DistributionDataset {
  period:        CheckInPeriod;
  buckets:       DistributionBucket[]; // always length 3, fixed order BELOW→MEETS→EXCEEDS
  scoredCount:   number;               // employees with a real score this period
  totalInScope:  number;               // every employee in scope, scored or not
}

// Builds the BELOW/MEETS/EXCEEDS counts for the given period.  Only
// scored employees feed into the denominator — rows with no approved
// sheet or no submitted check-in are excluded, so the histogram
// reflects "of the X people who have a score, how do they distribute".
// The "X of Y employees scored" subtitle (rendered by the component)
// keeps the missing context visible.
export async function loadDistributionDataset(
  user:   { id: string; role: Role },
  period: CheckInPeriod,
): Promise<DistributionDataset | null> {
  const scope = await loadCompletionScope(user, period);
  if (!scope) return null;

  const counts: Record<DistributionBand, number> = { BELOW: 0, MEETS: 0, EXCEEDS: 0 };
  let scoredCount = 0;
  for (const r of scope.rows) {
    if (r.avgScoreBand == null) continue;
    // bandFor() in completion.ts only returns BELOW/MEETS/EXCEEDS — never
    // "NA" — so the cast below is sound, but assert it explicitly.
    if (r.avgScoreBand === "NA") continue;
    counts[r.avgScoreBand]++;
    scoredCount++;
  }

  const order: DistributionBand[] = ["BELOW", "MEETS", "EXCEEDS"];
  const buckets: DistributionBucket[] = order.map((band) => ({
    band,
    count:       counts[band],
    pctOfScored: scoredCount > 0 ? (counts[band] / scoredCount) * 100 : 0,
  }));

  return {
    period,
    buckets,
    scoredCount,
    totalInScope: scope.rows.length,
  };
}

// ─────────────────────────────  MANAGER EFFECTIVENESS  ─────────────────────

export interface ManagerEffectivenessBar {
  managerId:     string;
  managerName:   string;
  avgScorePct:   number;            // 0..120+, the team's mean × 100
  band:          DistributionBand;  // BELOW / MEETS / EXCEEDS for bar fill
  employeeCount: number;            // scored employees feeding the average
}

export interface ManagerEffectivenessDataset {
  period:               CheckInPeriod;
  bars:                 ManagerEffectivenessBar[]; // sorted desc by avg
  orgMedianPct:         number | null;             // null when no team is scored anywhere
  unscoredManagerCount: number;                    // managers in caller scope with no scored team this period
  totalManagerCount:    number;                    // total managers in caller scope (scored + unscored)
}

// Computes per-team averages and the org median for the selected period.
// The median is always computed across every manager team in the org —
// even for the manager view — so the dashed reference line gives them a
// fair benchmark.  Bars themselves stay scope-bound: admin sees all
// teams, manager sees only their own.
export async function loadManagerEffectivenessDataset(
  user:   { id: string; role: Role },
  period: CheckInPeriod,
): Promise<ManagerEffectivenessDataset | null> {
  // Pull org-wide rows for the median.  Admin already has org scope; for
  // a manager we synthesise an admin probe so the same loadCompletionScope
  // path returns every team's rows in one call.
  const orgScope = await loadCompletionScope(
    user.role === Role.ADMIN ? user : { id: user.id, role: Role.ADMIN },
    period,
  );
  if (!orgScope) return null;

  // Group org rows by manager.  Managers with employees but no scored
  // ones still get a slot so the "X managers with no scored team this
  // period" disclaimer can count them.
  const byManager = new Map<
    string,
    { managerId: string; managerName: string; rawScores: number[] }
  >();
  for (const r of orgScope.rows) {
    if (r.managerId == null || r.managerName == null) continue;
    const slot = byManager.get(r.managerId) ?? {
      managerId:   r.managerId,
      managerName: r.managerName,
      rawScores:   [],
    };
    if (r.avgScore != null) slot.rawScores.push(r.avgScore);
    byManager.set(r.managerId, slot);
  }

  const allTeams = [...byManager.values()].map((m) => ({
    ...m,
    avgScore:      averageScore(m.rawScores),
    employeeCount: m.rawScores.length,
  }));

  // Org median across every team that has a scored employee.  Median
  // (not mean) so a single outlier team doesn't drag the reference.
  const scoredAvgs = allTeams
    .filter((t) => t.avgScore != null)
    .map((t) => t.avgScore as number)
    .sort((a, b) => a - b);
  const orgMedian = median(scoredAvgs);

  // Filter to caller scope for the bars.  Manager sees only their bar;
  // admin sees all teams.
  const callerScopedTeams =
    user.role === Role.ADMIN
      ? allTeams
      : allTeams.filter((t) => t.managerId === user.id);

  const unscoredManagerCount = callerScopedTeams.filter(
    (t) => t.avgScore == null,
  ).length;

  const bars: ManagerEffectivenessBar[] = callerScopedTeams
    .filter((t) => t.avgScore != null)
    .sort((a, b) => (b.avgScore as number) - (a.avgScore as number))
    .map((t) => {
      const score = t.avgScore as number;
      const raw = bandFor(score);
      // bandFor never returns "NA" (it's pure score → band); narrow the
      // type rather than cast through any.
      const band: DistributionBand = raw === "NA" ? "BELOW" : raw;
      return {
        managerId:     t.managerId,
        managerName:   t.managerName,
        avgScorePct:   score * 100,
        band,
        employeeCount: t.employeeCount,
      };
    });

  return {
    period,
    bars,
    orgMedianPct:         orgMedian == null ? null : orgMedian * 100,
    unscoredManagerCount,
    totalManagerCount:    callerScopedTeams.length,
  };
}

function median(sortedAsc: number[]): number | null {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedAsc[mid - 1] + sortedAsc[mid]) / 2 : sortedAsc[mid];
}
