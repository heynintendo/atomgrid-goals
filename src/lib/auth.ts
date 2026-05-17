import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const DEMO_COOKIE = "demo_uid";

// HMAC-SHA256 sign/verify.  The cookie body is `<userId>.<base64url-sig>`.
// Tampering invalidates the signature — server treats as unauthenticated.

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and add it to .env",
    );
  }
  return s;
}

export function sign(value: string): string {
  const sig = createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
  return `${value}.${sig}`;
}

export function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return value;
}

// Server helper — every route group calls this to identify the current
// actor.  Tries the demo HMAC cookie first (primary path for judges
// using the role-switcher), falls back to the Auth.js JWT session
// (the H19 Microsoft Entra ID SSO path).  Both paths converge on the
// same User row so the rest of the app is auth-agnostic.
export async function getCurrentUser() {
  const store = await cookies();
  const cookie = store.get(DEMO_COOKIE);

  let userId: string | null = null;
  if (cookie?.value) {
    userId = verify(cookie.value);
  }

  if (!userId) {
    // Lazy import — Auth.js's `auth()` pulls in next-auth (and the
    // Microsoft provider) at module-load time, which is the wrong
    // tradeoff for every server component that just wants the demo
    // identity.  Only pay that cost when the demo cookie is absent.
    const { auth } = await import("@/auth");
    const session = await auth();
    if (session?.userId) userId = session.userId;
  }

  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      department: true,
      manager: { select: { id: true, name: true, email: true } },
    },
  });
}

// Convenience getters for the role-switcher dropdown.  Lookups by email
// (the seeded demo identities have stable emails).
export async function getDemoIdentities() {
  return prisma.user.findMany({
    where: { email: { in: ["admin@demo", "mgr@demo", "emp@demo"] } },
    orderBy: { role: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { name: true } },
    },
  });
}

// Full identity roster for the "More identities" submenu.  Returned sorted
// by role (ADMIN → MANAGER → EMPLOYEE) then name so the submenu groups
// cleanly without client-side bucketing.
export async function getAllIdentities() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { name: true } },
    },
  });
}
