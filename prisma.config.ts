import { defineConfig } from "prisma/config";

// Prisma 7 moved connection URLs out of schema.prisma into this file.
// The datasource.url here is the DIRECT (unpooled) Neon connection — used by
// `prisma migrate` to alter schema.  At runtime, the app talks to Neon via
// PrismaNeon adapter using the pooled DATABASE_URL (see src/lib/db.ts).
//
// The placeholder fallback lets `prisma validate`/`format` run offline (they
// never connect).  Real value comes from .env at migrate time.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
