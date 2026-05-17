import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  EscalationLevel,
  EscalationStatus,
  GoalSheetStatus,
  GoalStatus,
  Role,
  UomType,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkAndCreateEscalations } from "@/lib/escalations";

// ─────────────────────────────────────────────────────────────────────
// Test fixtures
//
// Tests create their own department + cycle + thrust area + manager
// scoped behind names starting with "Esc.Test " so cleanup is a single
// query.  Test employees are created per-test (via makeTestEmployee)
// and torn down in afterEach.  The seed cycle and seed users are left
// untouched — assertions filter by `targetUserId` so engine output for
// seed users (if any) doesn't pollute counts.
// ─────────────────────────────────────────────────────────────────────

const TEST_PREFIX = "Esc.Test ";

interface TestFixtures {
  cycleId:        string;
  managerId:      string;
  thrustAreaId:   string;
  departmentId:   string;
}

let fx: TestFixtures;

async function ensureFixtures(): Promise<TestFixtures> {
  const dept = await prisma.department.create({
    data: { name: `${TEST_PREFIX}Department ${Date.now()}` },
  });
  const cycle = await prisma.cycle.create({
    data: {
      name:               `${TEST_PREFIX}FY2026`,
      startDate:          new Date("2026-04-01"),
      endDate:            new Date("2027-04-01"),
      goalSettingOpensAt: new Date("2026-04-01"),
      q1OpensAt:          new Date("2026-07-01"),
      q2OpensAt:          new Date("2026-10-01"),
      q3OpensAt:          new Date("2027-01-01"),
      annualOpensAt:      new Date("2027-03-01"),
      isActive:           true,
    },
  });
  const thrustArea = await prisma.thrustArea.create({
    data: { name: `${TEST_PREFIX}Revenue`, departmentId: dept.id },
  });
  const manager = await prisma.user.create({
    data: {
      name:         `${TEST_PREFIX}Manager`,
      email:        `esc.test.mgr.${Date.now()}@test`,
      role:         Role.MANAGER,
      departmentId: dept.id,
    },
  });
  return {
    cycleId:      cycle.id,
    managerId:    manager.id,
    thrustAreaId: thrustArea.id,
    departmentId: dept.id,
  };
}

// Creates a fresh test employee with the requested sheet status and
// optional Q1 check-in coverage.  Returns ids the test asserts against.
async function makeTestEmployee(opts: {
  sheetStatus:   GoalSheetStatus | "NO_SHEET";
  fullQ1Checkin: boolean;
}): Promise<{ userId: string; sheetId: string | null; goalId: string | null }> {
  const user = await prisma.user.create({
    data: {
      name:         `${TEST_PREFIX}Employee ${Math.random().toString(36).slice(2, 8)}`,
      email:        `esc.test.emp.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@test`,
      role:         Role.EMPLOYEE,
      departmentId: fx.departmentId,
      managerId:    fx.managerId,
    },
  });

  if (opts.sheetStatus === "NO_SHEET") {
    return { userId: user.id, sheetId: null, goalId: null };
  }

  const sheet = await prisma.goalSheet.create({
    data: {
      ownerId:     user.id,
      cycleId:     fx.cycleId,
      status:      opts.sheetStatus,
      submittedAt: opts.sheetStatus !== GoalSheetStatus.DRAFT ? new Date("2026-05-01") : null,
      approvedAt:  opts.sheetStatus === GoalSheetStatus.APPROVED ? new Date("2026-05-03") : null,
    },
  });
  const goal = await prisma.goal.create({
    data: {
      sheetId:      sheet.id,
      thrustAreaId: fx.thrustAreaId,
      title:        "Test goal",
      uomType:      UomType.MIN,
      uomLabel:     "$",
      target:       100,
      weightage:    100,
    },
  });
  if (opts.fullQ1Checkin) {
    await prisma.checkIn.create({
      data: {
        goalId:         goal.id,
        period:         "Q1",
        actual:         90,
        employeeStatus: GoalStatus.ON_TRACK,
        computedScore:  0.9,
      },
    });
  }
  return { userId: user.id, sheetId: sheet.id, goalId: goal.id };
}

async function setSystemDate(d: Date | null): Promise<void> {
  await prisma.systemSettings.upsert({
    where:  { id: 1 },
    update: { systemDate: d },
    create: { id: 1, systemDate: d },
  });
}

// Wipe every engine-produced row (ruleId IS NULL) AND every test user's
// rows.  Leaves the seeded "goal sheet not submitted" escalation alone
// since it has a ruleId.
async function wipeEngineEscalations(): Promise<void> {
  await prisma.escalationEvent.deleteMany({ where: { ruleId: null } });
}

// Drops only the test-employee rows.  Fixture manager + thrust area +
// cycle + department survive across `afterEach` so each test rebuilds
// only what it owns.  Without this scoping, the manager FK gets nuked
// and every subsequent test fails its prisma.user.create() with a
// User_managerId_fkey violation.
async function cleanupTestRows(): Promise<void> {
  const testEmployees = await prisma.user.findMany({
    where: { email: { startsWith: "esc.test.emp." } },
    select: { id: true },
  });
  const ids = testEmployees.map((u) => u.id);
  if (ids.length === 0) return;
  await prisma.escalationEvent.deleteMany({ where: { targetUserId: { in: ids } } });
  await prisma.checkIn.deleteMany({ where: { goal: { sheet: { ownerId: { in: ids } } } } });
  await prisma.goal.deleteMany({ where: { sheet: { ownerId: { in: ids } } } });
  await prisma.goalSheet.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function cleanupFixtureUsers(): Promise<void> {
  const fixtureUsers = await prisma.user.findMany({
    where: { email: { startsWith: "esc.test.mgr." } },
    select: { id: true },
  });
  const ids = fixtureUsers.map((u) => u.id);
  if (ids.length === 0) return;
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function cleanupTestFixtures(): Promise<void> {
  await prisma.thrustArea.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.cycle.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.department.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

beforeAll(async () => {
  // Tear down any leftovers from a crashed previous run, then build a
  // fresh fixture set this run owns.
  await cleanupTestRows();
  await cleanupFixtureUsers();
  await cleanupTestFixtures();
  fx = await ensureFixtures();
});

beforeEach(async () => {
  await setSystemDate(null);
  await wipeEngineEscalations();
});

afterEach(async () => {
  await cleanupTestRows();
});

afterAll(async () => {
  await wipeEngineEscalations();
  await cleanupTestRows();
  await cleanupFixtureUsers();
  await cleanupTestFixtures();
  await setSystemDate(null);
  await prisma.$disconnect();
});

// Q1 closes when Q2 opens — 2026-10-01.  Use 2026-10-15 as "well past
// Q1 close", and 2026-08-15 as "mid-Q1, window still open".
const PAST_Q1_CLOSE = new Date("2026-10-15");
const MID_Q1        = new Date("2026-08-15");

describe("checkAndCreateEscalations", () => {
  it("1. IDEMPOTENCY — second run inserts zero new rows", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: false,
    });
    await setSystemDate(PAST_Q1_CLOSE);

    const first = await checkAndCreateEscalations();
    const countAfterFirst = await prisma.escalationEvent.count({
      where: { targetUserId: userId },
    });
    expect(countAfterFirst).toBe(1);
    expect(first.newLevel1).toBeGreaterThanOrEqual(1);

    const second = await checkAndCreateEscalations();
    const countAfterSecond = await prisma.escalationEvent.count({
      where: { targetUserId: userId },
    });
    expect(countAfterSecond).toBe(countAfterFirst);
    expect(second.newLevel1).toBe(0);
    expect(second.newLevel2).toBe(0);
  });

  it("2. FRESH ESCALATION — creates L1 with period, reason, MANAGER level", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: false,
    });
    await setSystemDate(PAST_Q1_CLOSE);

    await checkAndCreateEscalations();

    const rows = await prisma.escalationEvent.findMany({
      where: { targetUserId: userId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].currentLevel).toBe(EscalationLevel.MANAGER);
    expect(rows[0].period).toBe("Q1");
    expect(rows[0].status).toBe(EscalationStatus.ACTIVE);
    expect(rows[0].reason).toMatch(/Q1 check-in not submitted by deadline/);
    expect(rows[0].reason).toMatch(/window closed 2026-10-01/);
    expect(rows[0].triggeredAt).toBeInstanceOf(Date);
    expect(rows[0].ruleId).toBeNull();
  });

  it("3. L1 → L2 TRANSITION — L1 older than 7 days promotes, L1 row preserved", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: false,
    });
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    await prisma.escalationEvent.create({
      data: {
        targetUserId: userId,
        period:       "Q1",
        currentLevel: EscalationLevel.MANAGER,
        status:       EscalationStatus.ACTIVE,
        triggeredAt:  eightDaysAgo,
        reason:       "Q1 check-in not submitted by deadline (window closed 2026-10-01)",
        notifiedLog:  [],
      },
    });

    const result = await checkAndCreateEscalations();
    expect(result.newLevel2).toBeGreaterThanOrEqual(1);

    const rows = await prisma.escalationEvent.findMany({
      where: { targetUserId: userId, period: "Q1" },
      orderBy: { currentLevel: "asc" },
    });
    const levels = rows.map((r) => r.currentLevel).sort();
    expect(levels).toContain(EscalationLevel.MANAGER);
    expect(levels).toContain(EscalationLevel.SKIP_LEVEL);

    const l2 = rows.find((r) => r.currentLevel === EscalationLevel.SKIP_LEVEL);
    expect(l2?.reason).toMatch(/Manager has not acted on Q1 escalation for 7\+ days/);
    expect(l2?.contextRef).toBeDefined();
  });

  it("4. L1 → L2 NEGATIVE — L1 only 5 days old does not promote", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: true,  // already submitted, no L1 will be generated this run
    });
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    await prisma.escalationEvent.create({
      data: {
        targetUserId: userId,
        period:       "Q1",
        currentLevel: EscalationLevel.MANAGER,
        status:       EscalationStatus.ACTIVE,
        triggeredAt:  fiveDaysAgo,
        reason:       "Q1 check-in not submitted by deadline (window closed 2026-10-01)",
        notifiedLog:  [],
      },
    });

    await checkAndCreateEscalations();

    const l2Count = await prisma.escalationEvent.count({
      where: { targetUserId: userId, currentLevel: EscalationLevel.SKIP_LEVEL },
    });
    expect(l2Count).toBe(0);
  });

  it("5. NEGATIVE — submitted check-in blocks L1 even past window close", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: true,
    });
    await setSystemDate(PAST_Q1_CLOSE);

    await checkAndCreateEscalations();

    const count = await prisma.escalationEvent.count({
      where: { targetUserId: userId, period: "Q1" },
    });
    expect(count).toBe(0);
  });

  it("6. NEGATIVE — DRAFT sheet does not escalate (check-in not yet possible)", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.DRAFT,
      fullQ1Checkin: false,
    });
    await setSystemDate(PAST_Q1_CLOSE);

    await checkAndCreateEscalations();

    const count = await prisma.escalationEvent.count({
      where: { targetUserId: userId },
    });
    expect(count).toBe(0);
  });

  it("7. NEGATIVE — before window closes, no L1 fires", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: false,
    });
    await setSystemDate(MID_Q1);

    await checkAndCreateEscalations();

    const count = await prisma.escalationEvent.count({
      where: { targetUserId: userId },
    });
    expect(count).toBe(0);
  });

  it("8. RESOLVED L1 does not re-fire — dedupe key spans status", async () => {
    const { userId } = await makeTestEmployee({
      sheetStatus:   GoalSheetStatus.APPROVED,
      fullQ1Checkin: false,
    });
    await prisma.escalationEvent.create({
      data: {
        targetUserId: userId,
        period:       "Q1",
        currentLevel: EscalationLevel.MANAGER,
        status:       EscalationStatus.RESOLVED,
        triggeredAt:  new Date("2026-10-02"),
        resolvedAt:   new Date("2026-10-10"),
        reason:       "Q1 check-in not submitted by deadline (window closed 2026-10-01)",
        notifiedLog:  [],
      },
    });
    await setSystemDate(PAST_Q1_CLOSE);

    await checkAndCreateEscalations();

    const rows = await prisma.escalationEvent.findMany({
      where: {
        targetUserId: userId,
        period:       "Q1",
        currentLevel: EscalationLevel.MANAGER,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe(EscalationStatus.RESOLVED);
  });
});
