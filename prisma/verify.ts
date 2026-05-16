// One-shot verify — read row counts and key invariants after seeding.
// Not part of the seed pipeline; safe to delete after H4.
import { PrismaNeon } from "@prisma/adapter-neon";
import { GoalSheetStatus, PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [department, thrustArea, user, cycle, goalSheet, goal, sharedGoalLink, checkIn, auditLog, escalationRule, escalationEvent, systemSettings] =
    await Promise.all([
      prisma.department.count(),
      prisma.thrustArea.count(),
      prisma.user.count(),
      prisma.cycle.count(),
      prisma.goalSheet.count(),
      prisma.goal.count(),
      prisma.sharedGoalLink.count(),
      prisma.checkIn.count(),
      prisma.auditLog.count(),
      prisma.escalationRule.count(),
      prisma.escalationEvent.count(),
      prisma.systemSettings.count(),
    ]);

  console.log("Row counts:");
  console.table({
    department,
    thrustArea,
    user,
    cycle,
    goalSheet,
    goal,
    sharedGoalLink,
    checkIn,
    auditLog,
    escalationRule,
    escalationEvent,
    systemSettings,
  });

  const byStatus = await prisma.goalSheet.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("\nGoal sheets by status:");
  console.table(
    Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
  );

  const sharedCopies = await prisma.goal.count({
    where: { sharedFromId: { not: null } },
  });
  console.log(`\nShared-goal copies (sharedFromId != null): ${sharedCopies}`);

  const demoUsers = await prisma.user.findMany({
    where: { email: { in: ["admin@demo", "mgr@demo", "emp@demo"] } },
    select: { email: true, name: true, role: true },
  });
  console.log("\nDemo identities:");
  console.table(demoUsers);

  // Karthik's team check
  const karthik = await prisma.user.findUnique({ where: { email: "mgr@demo" } });
  const karthikReports = await prisma.user.findMany({
    where: { managerId: karthik?.id },
    select: { name: true, email: true, goalSheets: { select: { status: true } } },
    orderBy: { name: "asc" },
  });
  console.log(`\nKarthik's reports (${karthikReports.length}):`);
  console.table(
    karthikReports.map((u) => ({
      name: u.name,
      email: u.email,
      sheetStatus: u.goalSheets[0]?.status ?? "—",
    })),
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
