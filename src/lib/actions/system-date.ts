"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/goals";

const setInputSchema = z.object({
  date: z.string().min(1, "Pick a date"),
});

async function adminGuard() {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Not signed in" };
  if (user.role !== Role.ADMIN) {
    return { ok: false as const, error: "Admin-only — switch to Priya" };
  }
  return { ok: true as const, user };
}

export async function setSystemDate(raw: unknown): Promise<ActionResult> {
  const guard = await adminGuard();
  if (!guard.ok) return { ok: false, error: guard.error };

  const parsed = setInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors.date?.[0] ?? "Invalid date" };
  }

  // Parse to a UTC midnight Date so day comparisons don't drift across
  // local timezones.  The picker emits YYYY-MM-DD.
  const date = new Date(`${parsed.data.date}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Couldn't parse that date" };
  }

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: { systemDate: date, updatedById: guard.user.id },
    create: { id: 1, systemDate: date, updatedById: guard.user.id },
  });

  // Layout-level revalidation refreshes the date pill + banner everywhere.
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function resetSystemDate(): Promise<ActionResult> {
  const guard = await adminGuard();
  if (!guard.ok) return { ok: false, error: guard.error };

  await prisma.systemSettings.upsert({
    where: { id: 1 },
    update: { systemDate: null, updatedById: guard.user.id },
    create: { id: 1, systemDate: null, updatedById: guard.user.id },
  });
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}
