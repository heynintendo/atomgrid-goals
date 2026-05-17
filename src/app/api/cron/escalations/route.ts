import { NextResponse, type NextRequest } from "next/server";
import { checkAndCreateEscalations } from "@/lib/escalations";

// Daily 02:00 UTC = 07:30 IST per vercel.json.  Hobby-tier compliant
// (one cron per project, once per day max).  Vercel Cron sends an
// `Authorization: Bearer <CRON_SECRET>` header automatically when the
// CRON_SECRET project env var is set; we mirror that bearer check
// here so neither a public GET nor a missing-secret deploy can fire
// the engine accidentally.
//
// 401 paths:
//   - CRON_SECRET unset server-side → never authorize
//   - Header missing
//   - Header malformed (no "Bearer " prefix)
//   - Token mismatch
//
// 200 path: runs the engine, returns the per-phase insert counts that
// Postgres confirmed.  Console-logged for the Vercel runtime log.
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 401 },
    );
  }
  const header = req.headers.get("authorization");
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndCreateEscalations();
    console.log("[cron/escalations]", JSON.stringify(result));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[cron/escalations] failed", err);
    return NextResponse.json(
      { error: "Escalation engine failed", message: String(err) },
      { status: 500 },
    );
  }
}
