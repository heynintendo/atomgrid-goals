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
// actor.  Currently reads only the demo cookie; H19 will fold in the
// Auth.js (Entra ID) session so both paths converge on this return value.
export async function getCurrentUser() {
  const store = await cookies();
  const cookie = store.get(DEMO_COOKIE);
  if (!cookie?.value) return null;

  const userId = verify(cookie.value);
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
