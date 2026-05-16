import { describe, expect, it } from "vitest";
import { averageScore, computeScore } from "./scoring";

describe("averageScore — un-capped mean for dashboard average", () => {
  it("averages without capping any input at 1.0", () => {
    // 0.24 + 0.333 + 1.022 = 1.595 → /3 = 0.5317; capping to 1.0 would
    // give 0.5243 instead.
    expect(averageScore([0.24, 0.333, 1.022])).toBeCloseTo(0.5317, 3);
  });
  it("returns null for an empty array", () => {
    expect(averageScore([])).toBeNull();
  });
});

describe("computeScore — MIN (higher is better)", () => {
  it("ratio < 1 → BELOW band, pct display", () => {
    const r = computeScore({ uomType: "MIN", target: 1_000_000, actual: 600_000 });
    expect(r.raw).toBeCloseTo(0.6);
    expect(r.score).toBeCloseTo(0.6);
    expect(r.banded).toBe("BELOW");
    expect(r.display).toBe("60.0%");
  });
  it("ratio between 0.7 and 1.0 → MEETS", () => {
    const r = computeScore({ uomType: "MIN", target: 100, actual: 85 });
    expect(r.banded).toBe("MEETS");
  });
  it("ratio ≥ 1.0 → EXCEEDS, score clamped to 1", () => {
    const r = computeScore({ uomType: "MIN", target: 1_000_000, actual: 1_150_000 });
    expect(r.raw).toBeCloseTo(1.15);
    expect(r.score).toBe(1);
    expect(r.banded).toBe("EXCEEDS");
    expect(r.display).toBe("115.0%");
  });
  it("edge: target = 0 → NA band, score 0", () => {
    const r = computeScore({ uomType: "MIN", target: 0, actual: 5 });
    expect(r.banded).toBe("NA");
    expect(r.score).toBe(0);
    expect(r.display).toContain("N/A");
  });
});

describe("computeScore — MAX (lower is better)", () => {
  it("target/actual ≤ 1 (actual high) → BELOW", () => {
    const r = computeScore({ uomType: "MAX", target: 24, actual: 50 });
    expect(r.raw).toBeCloseTo(0.48);
    expect(r.banded).toBe("BELOW");
  });
  it("target/actual in 0.7..0.999 → MEETS", () => {
    const r = computeScore({ uomType: "MAX", target: 24, actual: 30 });
    expect(r.raw).toBeCloseTo(0.8);
    expect(r.banded).toBe("MEETS");
    expect(r.display).toBe("80.0%");
  });
  it("ratio ≥ 1 (actual at or below target) → EXCEEDS clamped", () => {
    const r = computeScore({ uomType: "MAX", target: 100, actual: 80 });
    expect(r.raw).toBeCloseTo(1.25);
    expect(r.score).toBe(1);
    expect(r.banded).toBe("EXCEEDS");
  });
  it("edge: actual = 0, target > 0 → 'Exceeded (held at 0)'", () => {
    const r = computeScore({ uomType: "MAX", target: 5, actual: 0 });
    expect(r.score).toBe(1);
    expect(r.banded).toBe("EXCEEDS");
    expect(r.display).toBe("Exceeded (held at 0)");
  });
});

describe("computeScore — TIMELINE", () => {
  it("on-time → EXCEEDS, 'On time'", () => {
    const d = new Date("2026-09-30");
    const r = computeScore({ uomType: "TIMELINE", targetDate: d, actualDate: d });
    expect(r.score).toBe(1);
    expect(r.display).toBe("On time");
    expect(r.banded).toBe("EXCEEDS");
  });
  it("early → EXCEEDS with 'Early by N days'", () => {
    const r = computeScore({
      uomType: "TIMELINE",
      targetDate: new Date("2026-09-30"),
      actualDate: new Date("2026-09-25"),
    });
    expect(r.score).toBe(1);
    expect(r.display).toBe("Early by 5 days");
  });
  it("5 days late → MEETS (1 - 5/30 ≈ 0.833)", () => {
    const r = computeScore({
      uomType: "TIMELINE",
      targetDate: new Date("2026-09-30"),
      actualDate: new Date("2026-10-05"),
    });
    expect(r.raw).toBeCloseTo(1 - 5 / 30);
    expect(r.banded).toBe("MEETS");
    expect(r.display).toBe("5 days late");
  });
  it("> 30 days late → BELOW with score floor at 0", () => {
    const r = computeScore({
      uomType: "TIMELINE",
      targetDate: new Date("2026-09-30"),
      actualDate: new Date("2026-12-15"),
    });
    expect(r.score).toBe(0);
    expect(r.banded).toBe("BELOW");
  });
});

describe("computeScore — ZERO (zero = success)", () => {
  it("achieved=true → EXCEEDS, 'Achieved (0)'", () => {
    const r = computeScore({ uomType: "ZERO", achieved: true });
    expect(r.score).toBe(1);
    expect(r.display).toBe("Achieved (0)");
    expect(r.banded).toBe("EXCEEDS");
  });
  it("achieved=false → BELOW, 'Not achieved'", () => {
    const r = computeScore({ uomType: "ZERO", achieved: false });
    expect(r.score).toBe(0);
    expect(r.display).toBe("Not achieved");
    expect(r.banded).toBe("BELOW");
  });
});
