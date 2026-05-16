"use client";

import { useState } from "react";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableCellNumeric,
  TableHead,
  TableHeader,
  TableHeadSortable,
  TableRow,
} from "@/components/ui/table";

const SAMPLE = [
  { id: "GS-101", employee: "Riya Sharma",   thrust: "Revenue Growth",         target: 1_000_000, actual: 1_150_000 },
  { id: "GS-102", employee: "Karthik Iyer",  thrust: "Operational Excellence", target: 24,        actual: 30 },
  { id: "GS-103", employee: "Priya Nair",    thrust: "Customer Success",       target: 95,        actual: 92 },
  { id: "GS-104", employee: "Arjun Mehta",   thrust: "People & Culture",       target: 100,       actual: 100 },
  { id: "GS-105", employee: "Sneha Rao",     thrust: "Revenue Growth",         target: 500_000,   actual: 480_000 },
];

type Sort = "asc" | "desc" | null;

export default function SandboxPage() {
  const [sort, setSort] = useState<Sort>("desc");
  const toggleSort = () =>
    setSort((s) => (s === null ? "asc" : s === "asc" ? "desc" : null));

  const rows = [...SAMPLE].sort((a, b) => {
    if (sort === null) return 0;
    const diff = a.actual - b.actual;
    return sort === "asc" ? diff : -diff;
  });

  return (
    <main className="mx-auto max-w-[1200px] p-12">
      <header className="pb-16">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          H2 · Primitives sandbox
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-text">
          Design system — Button, Input, Table
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-text-secondary">
          Warm light enterprise system inspired by Lattice, Jira, and Stripe.
          These three primitives are committed before any feature work, so no
          screen ever ships with shadcn defaults that have to be retrofitted.
          Tokens live in <code className="font-mono text-text">app/globals.css</code>;
          everything below resolves from <code className="font-mono text-text">@theme</code>.
        </p>
      </header>

      <div className="space-y-12">
        <Section index="01" title="Buttons">
          <div className="space-y-3">
            {(["primary", "secondary", "ghost", "destructive"] as const).map(
              (variant) => (
                <div
                  key={variant}
                  className="flex flex-wrap items-center gap-3"
                >
                  <span className="w-28 shrink-0 font-mono text-xs uppercase tracking-wider text-text-muted">
                    {variant}
                  </span>
                  <Button variant={variant} size="sm">
                    Save draft
                  </Button>
                  <Button variant={variant} size="md">
                    Save draft
                  </Button>
                  <Button variant={variant} size="lg">
                    Save draft
                  </Button>
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                </div>
              ),
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="w-28 shrink-0 font-mono text-xs uppercase tracking-wider text-text-muted">
                with icon
              </span>
              <Button variant="primary">
                <Plus size={16} strokeWidth={1.75} />
                Add goal
              </Button>
              <Button variant="secondary">
                Continue
                <ChevronRight size={16} strokeWidth={1.75} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Delete">
                <Trash2 size={16} strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        </Section>

        <Section index="02" title="Inputs">
          <div className="grid max-w-md grid-cols-1 gap-4">
            <Field label="Email">
              <Input
                type="email"
                placeholder="riya@atomgrid.com"
                defaultValue="riya@atomgrid.com"
              />
            </Field>
            <Field label="Goal title">
              <Input placeholder="Grow Q1 enterprise pipeline" />
            </Field>
            <Field label="Locked (disabled)">
              <Input
                disabled
                defaultValue="Locked by manager approval"
                placeholder=""
              />
            </Field>
          </div>
        </Section>

        <Section index="03" title="Tables">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sheet</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Thrust area</TableHead>
                <TableHeadSortable
                  numeric
                  sort={sort}
                  onToggle={toggleSort}
                >
                  Actual
                </TableHeadSortable>
                <TableHead className="text-right">Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-mono text-xs text-text-muted">
                      {row.id}
                    </span>
                  </TableCell>
                  <TableCell>{row.employee}</TableCell>
                  <TableCell className="text-text-secondary">
                    {row.thrust}
                  </TableCell>
                  <TableCellNumeric>
                    {row.actual.toLocaleString("en-IN")}
                  </TableCellNumeric>
                  <TableCellNumeric className="text-text-secondary">
                    {row.target.toLocaleString("en-IN")}
                  </TableCellNumeric>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-text-muted">
            Click the <span className="text-text">Actual</span> header to cycle
            sort: desc → asc → none.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          {index}
        </span>
        <h2 className="text-base font-semibold text-text">{title}</h2>
      </div>
      <div className="rounded-lg border border-border bg-surface-1 p-8">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-xs font-medium uppercase tracking-wider text-text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
