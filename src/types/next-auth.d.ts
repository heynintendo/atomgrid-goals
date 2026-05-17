// Module augmentation for Auth.js v5.  Stamps `userId` onto the Session
// + JWT shapes so TypeScript stops complaining about the field we set
// in src/auth.ts's session() callback.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    userId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
  }
}
