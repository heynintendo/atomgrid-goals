import { redirect } from "next/navigation";
import { CheckInPeriod, Role } from "@prisma/client";
import {
  AnalyticsTabs,
  parseAnalyticsTab,
} from "@/components/analytics-tabs";
import {
  AnalyticsQoQ,
  type QoQChartRow,
  type QoQChartTeam,
} from "@/components/analytics-qoq";
import { AnalyticsHeatmap } from "@/components/analytics-heatmap";
import { AnalyticsDistribution } from "@/components/analytics-distribution";
import { AnalyticsEffectiveness } from "@/components/analytics-effectiveness";
import { PeriodTabs } from "@/components/period-tabs";
import { getCurrentUser } from "@/lib/auth";
import {
  loadDistributionDataset,
  loadHeatmapDataset,
  loadManagerEffectivenessDataset,
  loadQoQDataset,
} from "@/lib/analytics";
import { chartSlotForManager } from "@/lib/analytics-colors";
import { parsePeriod } from "@/lib/completion";

const PERIOD_LABELS: Record<CheckInPeriod, string> = {
  Q1:     "Q1",
  Q2:     "Q2",
  Q3:     "Q3",
  ANNUAL: "Annual",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return (
      <div className="mx-auto max-w-2xl p-12">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Restricted
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          Not authorised
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Analytics is available to managers and admins only.
        </p>
      </div>
    );
  }

  const sp = await searchParams;
  const period = parsePeriod(sp.period);
  const tab = parseAnalyticsTab(sp.tab);
  const scopeLabel = user.role === Role.ADMIN ? "the org" : "your team";

  const preserveParams: Record<string, string> = { period, tab };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Reports · Analytics
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Performance analytics
        </h1>
        <p className="text-sm text-text-secondary">
          Trends, distribution, and manager effectiveness across {scopeLabel}.
        </p>
      </header>

      <PeriodTabs basePath="/reports/analytics" current={period} />
      <AnalyticsTabs
        basePath="/reports/analytics"
        current={tab}
        preserveParams={preserveParams}
      />

      {tab === "qoq" ? (
        <QoQTabContent user={user} period={period} />
      ) : tab === "heatmap" ? (
        <HeatmapTabContent user={user} period={period} />
      ) : tab === "distribution" ? (
        <DistributionTabContent user={user} period={period} />
      ) : (
        <EffectivenessTabContent user={user} period={period} />
      )}
    </div>
  );
}

async function EffectivenessTabContent({
  user,
  period,
}: {
  user: { id: string; role: Role };
  period: CheckInPeriod;
}) {
  const dataset = await loadManagerEffectivenessDataset(user, period);
  if (!dataset) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          No active cycle
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          Manager effectiveness activates once an admin marks a cycle active.
        </p>
      </div>
    );
  }
  return (
    <AnalyticsEffectiveness
      bars={dataset.bars}
      orgMedianPct={dataset.orgMedianPct}
      unscoredManagerCount={dataset.unscoredManagerCount}
      totalManagerCount={dataset.totalManagerCount}
      currentPeriodLabel={PERIOD_LABELS[period]}
      scope={user.role === Role.ADMIN ? "admin" : "manager"}
    />
  );
}

async function DistributionTabContent({
  user,
  period,
}: {
  user: { id: string; role: Role };
  period: CheckInPeriod;
}) {
  const dataset = await loadDistributionDataset(user, period);
  if (!dataset) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          No active cycle
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          The distribution histogram activates once an admin marks a cycle active.
        </p>
      </div>
    );
  }
  return (
    <AnalyticsDistribution
      buckets={dataset.buckets}
      scoredCount={dataset.scoredCount}
      totalInScope={dataset.totalInScope}
      currentPeriodLabel={PERIOD_LABELS[period]}
    />
  );
}

async function HeatmapTabContent({
  user,
  period,
}: {
  user: { id: string; role: Role };
  period: CheckInPeriod;
}) {
  const dataset = await loadHeatmapDataset(user);
  if (!dataset) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          No active cycle
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          The heatmap activates once an admin marks a cycle active.
        </p>
      </div>
    );
  }
  return (
    <AnalyticsHeatmap
      employees={dataset.employees}
      currentPeriod={period}
      hasAnyData={dataset.hasAnyData}
    />
  );
}

// Server component that fetches the QoQ dataset and reshapes it into
// the chart component's expected props.  Kept on the page rather than
// in /components/ because the reshape is purely a thin adapter — the
// data layer (lib/analytics.ts) and the visual layer
// (analytics-qoq.tsx) both stay generic.
async function QoQTabContent({
  user,
  period,
}: {
  user: { id: string; role: Role };
  period: CheckInPeriod;
}) {
  const dataset = await loadQoQDataset(user);

  const rows: QoQChartRow[] = dataset.points.map((p) => {
    const values: Record<string, number | null> = {};
    for (const team of dataset.teams) {
      const entry = p.teams.get(team.id);
      values[team.id] = entry?.avgScore == null ? null : entry.avgScore * 100;
    }
    return { period: PERIOD_LABELS[p.period], rawPeriod: p.period, values };
  });

  const currentPoint = dataset.points.find((p) => p.period === period);
  const teams: QoQChartTeam[] = dataset.teams.map((t) => {
    const slot = chartSlotForManager(t.name);
    const currentEntry = currentPoint?.teams.get(t.id);
    return {
      managerId:            t.id,
      managerName:          t.name,
      slot,
      currentValue:         currentEntry?.avgScore == null ? null : currentEntry.avgScore * 100,
      currentEmployeeCount: currentEntry?.employeeCount ?? 0,
    };
  });

  return (
    <AnalyticsQoQ
      rows={rows}
      teams={teams}
      currentPeriodLabel={PERIOD_LABELS[period]}
    />
  );
}

