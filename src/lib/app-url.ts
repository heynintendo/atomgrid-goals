// Public base URL of the deployed app, for absolute links built in
// server-rendered contexts (transactional emails, Open Graph metadata)
// where a relative path won't resolve.
//
// Precedence: NEXT_PUBLIC_APP_URL (set in Vercel after the project
// rename) → the Vercel-provided per-deployment URL → localhost for dev.
// VERCEL_URL carries no protocol, hence the https:// prefix; the explicit
// guard keeps the localhost fallback reachable when neither var is set.
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
