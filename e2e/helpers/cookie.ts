import { createHmac } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import type { Page } from "@playwright/test";

process.loadEnvFile(".env");

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
});

const cache = new Map<string, string>();

// Signs the demo cookie value for the given user email.  Mirrors
// sign() in src/lib/auth.ts.  Cached so iteration over many identities
// only hits Neon + AUTH_SECRET once per email.
export async function signedCookieFor(email: string): Promise<string> {
  const cached = cache.get(email);
  if (cached) return cached;
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  const sig = createHmac("sha256", process.env.AUTH_SECRET!)
    .update(u.id)
    .digest("base64url");
  const signed = `${u.id}.${sig}`;
  cache.set(email, signed);
  return signed;
}

// Sets the demo_uid cookie on the Playwright context for the given
// email.  Bypasses the role-switcher UI entirely — used by the
// screenshots test which iterates many identities and shouldn't depend
// on the UI dropdown working.  Flow tests should still exercise the
// click-through via the setRole helper in helpers/auth.ts.
export async function loginAs(page: Page, email: string): Promise<void> {
  const value = await signedCookieFor(email);
  await page.context().addCookies([
    {
      name: "demo_uid",
      value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function clearLogin(page: Page): Promise<void> {
  await page.context().clearCookies({ name: "demo_uid" });
}
