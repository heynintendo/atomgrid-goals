import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

// Auth.js v5 — real Microsoft Entra ID SSO.  Sits alongside the demo
// HMAC-cookie path in lib/auth.ts; getCurrentUser() in that file merges
// both signals so the rest of the app sees a single User identity
// regardless of which sign-in flow was used.
//
// Provider is configured solely by AUTH_MICROSOFT_ENTRA_ID_ID / SECRET /
// ISSUER env vars — Auth.js auto-discovers names with the AUTH_<PROVIDER>_
// prefix.  Empty/missing values short-circuit at provider construction so
// the deploy stays green even before the Vercel env vars are pasted.

export const { handlers, signIn, signOut, auth } = NextAuth({
  // JWT session — no DB-backed session table.  Survives across requests
  // without a Prisma round-trip per page load.
  session: { strategy: "jwt" },
  secret:  process.env.AUTH_SECRET,
  providers: [
    MicrosoftEntraID({
      clientId:     process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer:       process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
    }),
  ],
  pages: {
    // Both successful sign-in and sign-out land on /login.  The page
    // detects the existing session and routes to the role-aware home.
    signIn: "/login",
  },
  callbacks: {
    // Runs on the OAuth callback.  Provisions a User row in the DB the
    // first time an Entra account signs in; subsequent sign-ins find
    // the existing row.  Returning false denies sign-in.
    async signIn({ user, profile }) {
      const email = user.email ?? profile?.email ?? null;
      if (!email) {
        console.error("[auth/signIn] no email on Microsoft profile — denying");
        return false;
      }
      try {
        await prisma.user.upsert({
          where:  { email },
          update: {}, // existing user — leave role/manager untouched
          create: {
            email,
            name:  user.name ?? profile?.name ?? email.split("@")[0],
            role:  Role.EMPLOYEE,
          },
        });
        return true;
      } catch (err) {
        console.error("[auth/signIn] provisioning failed", err);
        return false;
      }
    },
    // Stamps the DB User.id onto the JWT so server components can resolve
    // the local User row in one trip.
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where:  { email: user.email },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && typeof token.userId === "string") {
        session.userId = token.userId;
      }
      return session;
    },
  },
});
