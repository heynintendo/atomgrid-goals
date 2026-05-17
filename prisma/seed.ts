// Idempotent dev seed: full org + mixed goal-sheet states per plan section 12.
// Run with `pnpm db:seed` (or directly via `pnpm exec tsx prisma/seed.ts`).
//
// The seed clears every table and re-inserts a coherent demo state so the
// hosted URL judges open always shows the same scene — no surprises, no
// drift between deploys.

import { PrismaNeon } from "@prisma/adapter-neon";
import {
  AuditAction,
  CheckInPeriod,
  CyclePhase,
  EscalationLevel,
  EscalationStatus,
  GoalSheetStatus,
  GoalStatus,
  PrismaClient,
  Role,
  UomType,
} from "@prisma/client";

process.loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Populate .env before seeding.");
}
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function clear() {
  // FK-order: leaf tables first, parents last.
  await prisma.auditLog.deleteMany();
  await prisma.sharedGoalLink.deleteMany();
  await prisma.escalationEvent.deleteMany();
  await prisma.escalationRule.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.goalSheet.deleteMany();
  await prisma.thrustArea.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.cycle.deleteMany();
  await prisma.systemSettings.deleteMany();
}

async function main() {
  console.log("⚠  Clearing existing data");
  await clear();

  // ────────────────────────── System settings ─────────────────────────────
  console.log("→ SystemSettings (real-time mode)");
  await prisma.systemSettings.create({
    data: { id: 1, systemDate: null },
  });

  // ────────────────────────── Cycle FY2026 ────────────────────────────────
  console.log("→ Cycle FY2026");
  const cycle = await prisma.cycle.create({
    data: {
      name: "FY2026",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      phase: CyclePhase.GOAL_SETTING,
      goalSettingOpensAt: new Date("2026-05-01"),
      q1OpensAt: new Date("2026-07-01"),
      q2OpensAt: new Date("2026-10-01"),
      q3OpensAt: new Date("2027-01-01"),
      annualOpensAt: new Date("2027-03-01"),
      isActive: true,
    },
  });

  // ────────────────────────── Departments ─────────────────────────────────
  console.log("→ Departments");
  const [sales, eng, ops] = await Promise.all([
    prisma.department.create({ data: { name: "Sales" } }),
    prisma.department.create({ data: { name: "Engineering" } }),
    prisma.department.create({ data: { name: "Operations" } }),
  ]);

  // ────────────────────────── Thrust areas (org-wide) ─────────────────────
  console.log("→ Thrust areas");
  const [taRevenue, taOpex, taCustomer, taPeople] = await Promise.all([
    prisma.thrustArea.create({ data: { name: "Revenue Growth", departmentId: null } }),
    prisma.thrustArea.create({ data: { name: "Operational Excellence", departmentId: null } }),
    prisma.thrustArea.create({ data: { name: "Customer Success", departmentId: null } }),
    prisma.thrustArea.create({ data: { name: "People & Culture", departmentId: null } }),
  ]);

  // ────────────────────────── Users ───────────────────────────────────────
  console.log("→ Users (1 admin, 3 managers, 12 employees)");
  const priya = await prisma.user.create({
    data: {
      email: "admin@demo",
      name: "Priya Nair",
      role: Role.ADMIN,
      departmentId: null,
      managerId: null,
    },
  });

  const karthik = await prisma.user.create({
    data: {
      email: "mgr@demo",
      name: "Karthik Iyer",
      role: Role.MANAGER,
      departmentId: sales.id,
      managerId: priya.id,
    },
  });
  const vikram = await prisma.user.create({
    data: {
      email: "vikram@demo",
      name: "Vikram Patel",
      role: Role.MANAGER,
      departmentId: eng.id,
      managerId: priya.id,
    },
  });
  const anita = await prisma.user.create({
    data: {
      email: "anita@demo",
      name: "Anita Reddy",
      role: Role.MANAGER,
      departmentId: ops.id,
      managerId: priya.id,
    },
  });

  // Sales (Karthik's team)
  const riya = await prisma.user.create({
    data: { email: "emp@demo", name: "Riya Sharma", role: Role.EMPLOYEE, departmentId: sales.id, managerId: karthik.id },
  });
  const aditya = await prisma.user.create({
    data: { email: "aditya@demo", name: "Aditya Verma", role: Role.EMPLOYEE, departmentId: sales.id, managerId: karthik.id },
  });
  const neha = await prisma.user.create({
    data: { email: "neha@demo", name: "Neha Kapoor", role: Role.EMPLOYEE, departmentId: sales.id, managerId: karthik.id },
  });
  const sanjay = await prisma.user.create({
    data: { email: "sanjay@demo", name: "Sanjay Gupta", role: Role.EMPLOYEE, departmentId: sales.id, managerId: karthik.id },
  });

  // Engineering (Vikram's team)
  const arjun = await prisma.user.create({
    data: { email: "arjun@demo", name: "Arjun Mehta", role: Role.EMPLOYEE, departmentId: eng.id, managerId: vikram.id },
  });
  const pooja = await prisma.user.create({
    data: { email: "pooja@demo", name: "Pooja Singh", role: Role.EMPLOYEE, departmentId: eng.id, managerId: vikram.id },
  });
  const rohan = await prisma.user.create({
    data: { email: "rohan@demo", name: "Rohan Das", role: Role.EMPLOYEE, departmentId: eng.id, managerId: vikram.id },
  });
  const kavya = await prisma.user.create({
    data: { email: "kavya@demo", name: "Kavya Pillai", role: Role.EMPLOYEE, departmentId: eng.id, managerId: vikram.id },
  });

  // Operations (Anita's team)
  const sneha = await prisma.user.create({
    data: { email: "sneha@demo", name: "Sneha Rao", role: Role.EMPLOYEE, departmentId: ops.id, managerId: anita.id },
  });
  const rahul = await prisma.user.create({
    data: { email: "rahul@demo", name: "Rahul Joshi", role: Role.EMPLOYEE, departmentId: ops.id, managerId: anita.id },
  });
  const maya = await prisma.user.create({
    data: { email: "maya@demo", name: "Maya Krishnan", role: Role.EMPLOYEE, departmentId: ops.id, managerId: anita.id },
  });
  const vivek = await prisma.user.create({
    data: { email: "vivek@demo", name: "Vivek Shah", role: Role.EMPLOYEE, departmentId: ops.id, managerId: anita.id },
  });

  // ────────────────────────── Karthik's sheet (shared KPI source) ─────────
  console.log("→ Karthik's sheet (source of the shared departmental KPI)");
  const karthikSheet = await prisma.goalSheet.create({
    data: {
      ownerId: karthik.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: new Date("2026-05-05"),
      approvedAt: new Date("2026-05-08"),
      approvedById: priya.id,
    },
  });
  const sharedSource = await prisma.goal.create({
    data: {
      sheetId: karthikSheet.id,
      thrustAreaId: taRevenue.id,
      title: "Hit Q1 enterprise revenue target",
      description: "Lead the Sales org to ₹5Cr in enterprise revenue for Q1 FY26.",
      uomType: UomType.MIN,
      uomLabel: "INR",
      target: 50_000_000,
      weightage: 100,
    },
  });
  // Karthik's Q1 check-in for the source goal — drives the sync to recipients.
  await prisma.checkIn.create({
    data: {
      goalId: sharedSource.id,
      period: CheckInPeriod.Q1,
      actual: 12_000_000, // ₹1.2Cr toward 5Cr target — 24% (BELOW band)
      employeeStatus: GoalStatus.ON_TRACK,
      computedScore: "0.2400",
      managerComment: "Q1 reflects pipeline build-out; expect ramp in Q2.",
      managerCommentBy: priya.id,
      managerCommentAt: new Date("2026-07-15"),
    },
  });

  // ────────────────────────── Riya — APPROVED + Q1 done ───────────────────
  console.log("→ Riya (APPROVED + Q1 done, includes shared KPI copy)");
  const riyaSheet = await prisma.goalSheet.create({
    data: {
      ownerId: riya.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: new Date("2026-05-06"),
      approvedAt: new Date("2026-05-09"),
      approvedById: karthik.id,
    },
  });
  const riyaShared = await prisma.goal.create({
    data: {
      sheetId: riyaSheet.id,
      thrustAreaId: taRevenue.id,
      title: sharedSource.title,
      description: sharedSource.description,
      uomType: sharedSource.uomType,
      uomLabel: sharedSource.uomLabel,
      target: sharedSource.target,
      weightage: 40,
      sharedFromId: sharedSource.id,
    },
  });
  const riyaG2 = await prisma.goal.create({
    data: {
      sheetId: riyaSheet.id,
      thrustAreaId: taRevenue.id,
      title: "Onboard 5 new enterprise accounts",
      description: "Focus on healthcare and BFSI segments.",
      uomType: UomType.MIN,
      uomLabel: "accounts",
      target: 6, // post-audit-edited target (was 5)
      weightage: 30,
    },
  });
  const riyaG3 = await prisma.goal.create({
    data: {
      sheetId: riyaSheet.id,
      thrustAreaId: taCustomer.id,
      title: "Maintain CSAT at 90 or above",
      description: "Across all enterprise accounts owned this quarter.",
      uomType: UomType.MIN,
      uomLabel: "score",
      target: 90,
      weightage: 30,
    },
  });
  // Riya's Q1 check-ins — shared goal copy gets the synced actual from Karthik.
  await prisma.checkIn.create({
    data: {
      goalId: riyaShared.id,
      period: CheckInPeriod.Q1,
      actual: 12_000_000,
      employeeStatus: GoalStatus.ON_TRACK,
      computedScore: "0.2400",
    },
  });
  await prisma.checkIn.create({
    data: {
      goalId: riyaG2.id,
      period: CheckInPeriod.Q1,
      actual: 2,
      employeeStatus: GoalStatus.ON_TRACK,
      computedScore: "0.3333",
      managerComment: "Strong start with healthcare segment, push on BFSI in Q2.",
      managerCommentBy: karthik.id,
      managerCommentAt: new Date("2026-07-12"),
    },
  });
  await prisma.checkIn.create({
    data: {
      goalId: riyaG3.id,
      period: CheckInPeriod.Q1,
      actual: 92,
      employeeStatus: GoalStatus.COMPLETED,
      computedScore: "1.0000", // 92/90 clamps to 1.0
    },
  });

  // ────────────────────────── Aditya — SUBMITTED, includes shared ─────────
  console.log("→ Aditya (SUBMITTED, includes shared KPI copy)");
  const adityaSheet = await prisma.goalSheet.create({
    data: {
      ownerId: aditya.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.SUBMITTED,
      submittedAt: new Date("2026-05-10"),
    },
  });
  const adityaShared = await prisma.goal.create({
    data: {
      sheetId: adityaSheet.id,
      thrustAreaId: taRevenue.id,
      title: sharedSource.title,
      description: sharedSource.description,
      uomType: sharedSource.uomType,
      uomLabel: sharedSource.uomLabel,
      target: sharedSource.target,
      weightage: 35,
      sharedFromId: sharedSource.id,
    },
  });
  await prisma.goal.create({
    data: {
      sheetId: adityaSheet.id,
      thrustAreaId: taRevenue.id,
      title: "Generate 200 sales-qualified leads",
      uomType: UomType.MIN,
      uomLabel: "leads",
      target: 200,
      weightage: 35,
    },
  });
  await prisma.goal.create({
    data: {
      sheetId: adityaSheet.id,
      thrustAreaId: taCustomer.id,
      title: "Reduce churn to under 3%",
      uomType: UomType.MAX,
      uomLabel: "%",
      target: 3,
      weightage: 30,
    },
  });

  // ────────────────────────── Neha — SUBMITTED, includes shared ───────────
  console.log("→ Neha (SUBMITTED, includes shared KPI copy)");
  const nehaSheet = await prisma.goalSheet.create({
    data: {
      ownerId: neha.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.SUBMITTED,
      submittedAt: new Date("2026-05-11"),
    },
  });
  const nehaShared = await prisma.goal.create({
    data: {
      sheetId: nehaSheet.id,
      thrustAreaId: taRevenue.id,
      title: sharedSource.title,
      description: sharedSource.description,
      uomType: sharedSource.uomType,
      uomLabel: sharedSource.uomLabel,
      target: sharedSource.target,
      weightage: 30,
      sharedFromId: sharedSource.id,
    },
  });
  await prisma.goal.create({
    data: {
      sheetId: nehaSheet.id,
      thrustAreaId: taRevenue.id,
      title: "Win 3 strategic logos",
      description: "Logos with ARR > ₹50L.",
      uomType: UomType.MIN,
      uomLabel: "logos",
      target: 3,
      weightage: 40,
    },
  });
  await prisma.goal.create({
    data: {
      sheetId: nehaSheet.id,
      thrustAreaId: taPeople.id,
      title: "Mentor 2 SDRs through ramp",
      uomType: UomType.MIN,
      uomLabel: "SDRs",
      target: 2,
      weightage: 30,
    },
  });

  // ────────────────────────── Shared-goal link rows ───────────────────────
  console.log("→ SharedGoalLink rows (Karthik → Riya/Aditya/Neha)");
  await prisma.sharedGoalLink.createMany({
    data: [
      { sourceGoalId: sharedSource.id, recipientGoalId: riyaShared.id, sourceUserId: karthik.id },
      { sourceGoalId: sharedSource.id, recipientGoalId: adityaShared.id, sourceUserId: karthik.id },
      { sourceGoalId: sharedSource.id, recipientGoalId: nehaShared.id, sourceUserId: karthik.id },
    ],
  });

  // ────────────────────────── Sanjay — DRAFT ──────────────────────────────
  console.log("→ Sanjay (DRAFT, sum != 100, not yet submitted)");
  const sanjaySheet = await prisma.goalSheet.create({
    data: { ownerId: sanjay.id, cycleId: cycle.id, status: GoalSheetStatus.DRAFT },
  });
  await prisma.goal.create({
    data: {
      sheetId: sanjaySheet.id,
      thrustAreaId: taRevenue.id,
      title: "Close ₹1Cr in mid-market deals",
      uomType: UomType.MIN,
      uomLabel: "INR",
      target: 10_000_000,
      weightage: 50,
    },
  });
  await prisma.goal.create({
    data: {
      sheetId: sanjaySheet.id,
      thrustAreaId: taPeople.id,
      title: "Complete 2 sales certifications",
      uomType: UomType.MIN,
      uomLabel: "certs",
      target: 2,
      weightage: 30,
    },
  });

  // ────────────────────────── Arjun — APPROVED + Q1 done ──────────────────
  console.log("→ Arjun (APPROVED + Q1 done)");
  const arjunSheet = await prisma.goalSheet.create({
    data: {
      ownerId: arjun.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: new Date("2026-05-04"),
      approvedAt: new Date("2026-05-07"),
      approvedById: vikram.id,
    },
  });
  const arjunG1 = await prisma.goal.create({
    data: {
      sheetId: arjunSheet.id,
      thrustAreaId: taOpex.id,
      title: "Zero P0 production incidents",
      uomType: UomType.ZERO,
      uomLabel: "incidents",
      target: null,
      weightage: 40,
    },
  });
  const arjunG2 = await prisma.goal.create({
    data: {
      sheetId: arjunSheet.id,
      thrustAreaId: taRevenue.id,
      title: "Ship 12 customer-impacting features",
      uomType: UomType.MIN,
      uomLabel: "features",
      target: 12,
      weightage: 35,
    },
  });
  const arjunG3 = await prisma.goal.create({
    data: {
      sheetId: arjunSheet.id,
      thrustAreaId: taOpex.id,
      title: "Hold p99 API latency under 200ms",
      uomType: UomType.MAX,
      uomLabel: "ms",
      target: 200,
      weightage: 25,
    },
  });
  await prisma.checkIn.create({
    data: { goalId: arjunG1.id, period: CheckInPeriod.Q1, zeroAchieved: true, employeeStatus: GoalStatus.ON_TRACK, computedScore: "1.0000" },
  });
  await prisma.checkIn.create({
    data: { goalId: arjunG2.id, period: CheckInPeriod.Q1, actual: 4, employeeStatus: GoalStatus.ON_TRACK, computedScore: "0.3333" },
  });
  await prisma.checkIn.create({
    data: { goalId: arjunG3.id, period: CheckInPeriod.Q1, actual: 180, employeeStatus: GoalStatus.COMPLETED, computedScore: "1.0000" },
  });

  // ────────────────────────── Pooja — APPROVED + Q1 done ──────────────────
  console.log("→ Pooja (APPROVED + Q1 done)");
  const poojaSheet = await prisma.goalSheet.create({
    data: {
      ownerId: pooja.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: new Date("2026-05-05"),
      approvedAt: new Date("2026-05-08"),
      approvedById: vikram.id,
    },
  });
  const poojaG1 = await prisma.goal.create({
    data: {
      sheetId: poojaSheet.id,
      thrustAreaId: taOpex.id,
      title: "Ship platform v3 by Aug 31",
      uomType: UomType.TIMELINE,
      uomLabel: "date",
      targetDate: new Date("2026-08-31"),
      weightage: 50,
    },
  });
  const poojaG2 = await prisma.goal.create({
    data: {
      sheetId: poojaSheet.id,
      thrustAreaId: taOpex.id,
      title: "Hold code coverage at 80% or above",
      uomType: UomType.MIN,
      uomLabel: "%",
      target: 80,
      weightage: 30,
    },
  });
  const poojaG3 = await prisma.goal.create({
    data: {
      sheetId: poojaSheet.id,
      thrustAreaId: taOpex.id,
      title: "Cut flaky test rate to under 5%",
      uomType: UomType.MAX,
      uomLabel: "%",
      target: 5,
      weightage: 20,
    },
  });
  // Pooja's Q1: progress visible but final completion will be Q2.
  await prisma.checkIn.create({
    data: { goalId: poojaG1.id, period: CheckInPeriod.Q1, actualDate: null, employeeStatus: GoalStatus.ON_TRACK, computedScore: null },
  });
  await prisma.checkIn.create({
    data: { goalId: poojaG2.id, period: CheckInPeriod.Q1, actual: 76, employeeStatus: GoalStatus.ON_TRACK, computedScore: "0.9500" },
  });
  await prisma.checkIn.create({
    data: { goalId: poojaG3.id, period: CheckInPeriod.Q1, actual: 7, employeeStatus: GoalStatus.ON_TRACK, computedScore: "0.7143" },
  });

  // ────────────────────────── Rohan — SUBMITTED ───────────────────────────
  console.log("→ Rohan (SUBMITTED)");
  const rohanSheet = await prisma.goalSheet.create({
    data: { ownerId: rohan.id, cycleId: cycle.id, status: GoalSheetStatus.SUBMITTED, submittedAt: new Date("2026-05-09") },
  });
  await prisma.goal.create({
    data: { sheetId: rohanSheet.id, thrustAreaId: taOpex.id, title: "Migrate 10 services to OTel", uomType: UomType.MIN, uomLabel: "services", target: 10, weightage: 40 },
  });
  await prisma.goal.create({
    data: { sheetId: rohanSheet.id, thrustAreaId: taOpex.id, title: "Reduce build time below 4 min", uomType: UomType.MAX, uomLabel: "min", target: 4, weightage: 30 },
  });
  await prisma.goal.create({
    data: { sheetId: rohanSheet.id, thrustAreaId: taPeople.id, title: "Run 6 internal tech talks", uomType: UomType.MIN, uomLabel: "talks", target: 6, weightage: 30 },
  });

  // ────────────────────────── Kavya — FRESH (no sheet) ────────────────────
  // Intentionally no sheet — this drives the escalation row below.

  // ────────────────────────── Sneha — APPROVED + Q1 done ──────────────────
  console.log("→ Sneha (APPROVED + Q1 done)");
  const snehaSheet = await prisma.goalSheet.create({
    data: {
      ownerId: sneha.id,
      cycleId: cycle.id,
      status: GoalSheetStatus.APPROVED,
      submittedAt: new Date("2026-05-04"),
      approvedAt: new Date("2026-05-07"),
      approvedById: anita.id,
    },
  });
  const snehaG1 = await prisma.goal.create({
    data: { sheetId: snehaSheet.id, thrustAreaId: taOpex.id, title: "Cut order TAT below 48h", uomType: UomType.MAX, uomLabel: "h", target: 48, weightage: 40 },
  });
  const snehaG2 = await prisma.goal.create({
    data: { sheetId: snehaSheet.id, thrustAreaId: taCustomer.id, title: "Hit 99% SLA compliance", uomType: UomType.MIN, uomLabel: "%", target: 99, weightage: 35 },
  });
  const snehaG3 = await prisma.goal.create({
    data: { sheetId: snehaSheet.id, thrustAreaId: taOpex.id, title: "Zero safety incidents", uomType: UomType.ZERO, uomLabel: "incidents", target: null, weightage: 25 },
  });
  await prisma.checkIn.create({
    data: { goalId: snehaG1.id, period: CheckInPeriod.Q1, actual: 52, employeeStatus: GoalStatus.ON_TRACK, computedScore: "0.9231" },
  });
  await prisma.checkIn.create({
    data: { goalId: snehaG2.id, period: CheckInPeriod.Q1, actual: 97.5, employeeStatus: GoalStatus.ON_TRACK, computedScore: "0.9848" },
  });
  await prisma.checkIn.create({
    data: { goalId: snehaG3.id, period: CheckInPeriod.Q1, zeroAchieved: true, employeeStatus: GoalStatus.COMPLETED, computedScore: "1.0000" },
  });

  // ────────────────────────── Rahul — SUBMITTED ───────────────────────────
  console.log("→ Rahul (SUBMITTED)");
  const rahulSheet = await prisma.goalSheet.create({
    data: { ownerId: rahul.id, cycleId: cycle.id, status: GoalSheetStatus.SUBMITTED, submittedAt: new Date("2026-05-10") },
  });
  await prisma.goal.create({
    data: { sheetId: rahulSheet.id, thrustAreaId: taOpex.id, title: "Standardise vendor SLAs across 3 regions", uomType: UomType.MIN, uomLabel: "regions", target: 3, weightage: 40 },
  });
  await prisma.goal.create({
    data: { sheetId: rahulSheet.id, thrustAreaId: taOpex.id, title: "Cut warehouse cost per order by 8%", uomType: UomType.MIN, uomLabel: "%", target: 8, weightage: 35 },
  });
  await prisma.goal.create({
    data: { sheetId: rahulSheet.id, thrustAreaId: taCustomer.id, title: "Hit NPS of 55", uomType: UomType.MIN, uomLabel: "NPS", target: 55, weightage: 25 },
  });

  // ────────────────────────── Maya — DRAFT ────────────────────────────────
  console.log("→ Maya (DRAFT)");
  const mayaSheet = await prisma.goalSheet.create({
    data: { ownerId: maya.id, cycleId: cycle.id, status: GoalSheetStatus.DRAFT },
  });
  await prisma.goal.create({
    data: { sheetId: mayaSheet.id, thrustAreaId: taOpex.id, title: "Roll out shift rota system", uomType: UomType.TIMELINE, uomLabel: "date", targetDate: new Date("2026-09-30"), weightage: 60 },
  });

  // Vivek — FRESH (no sheet).

  // ────────────────────────── Escalation rule + active event ──────────────
  console.log("→ Escalation rule + 1 active event on Kavya");
  const submissionRule = await prisma.escalationRule.create({
    data: {
      name: "Goal submission past due",
      triggerType: "GOAL_NOT_SUBMITTED",
      thresholdDays: 14,
      escalateToManagerAfterDays: 7,
      escalateToSkipLevelAfterDays: 14,
      escalateToHRAfterDays: 21,
      active: true,
    },
  });
  // Kavya's L1 is intentionally set to triggeredAt = 8 days ago in real
  // time so the very first cron run after seed (live demo) promotes
  // her row to L2 (SKIP_LEVEL).  The seed is otherwise deterministic;
  // this is the one line that's time-sensitive on purpose so judges
  // see the full L1 → L2 lifecycle without driving time-travel.
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await prisma.escalationEvent.create({
    data: {
      ruleId: submissionRule.id,
      targetUserId: kavya.id,
      period: "Q1",
      currentLevel: EscalationLevel.MANAGER,
      status: EscalationStatus.ACTIVE,
      triggeredAt: eightDaysAgo,
      reason: "Q1 check-in not submitted by deadline (window closed 2026-10-01)",
      notifiedLog: [
        {
          level: "MANAGER",
          emailedAt: eightDaysAgo.toISOString(),
          recipientId: kavya.id,
        },
      ],
      contextRef: cycle.id,
    },
  });

  // ────────────────────────── Audit log entry ─────────────────────────────
  console.log("→ Audit: Priya edited Riya's onboarding goal target post-approval");
  await prisma.auditLog.create({
    data: {
      goalId: riyaG2.id,
      sheetId: riyaSheet.id,
      action: AuditAction.GOAL_TARGET_EDITED,
      actorId: priya.id,
      before: { target: "5" },
      after: { target: "6" },
      reason:
        "Unlocked sheet at Karthik's request — Q1 pipeline review surfaced a larger opportunity. Target raised from 5 to 6 with employee + manager consent.",
      createdAt: new Date("2026-05-12T11:30:00Z"),
    },
  });

  console.log("✓ Seed complete");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
