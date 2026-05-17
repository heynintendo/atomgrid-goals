import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // DB-touching tests (escalations) make several network round-trips
    // to Neon; the 5s default is too tight.  Pure-logic tests still
    // finish in ms.
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@":           path.resolve(__dirname, "./src"),
      // `server-only` is a Next.js bundler guard with no node-resolvable
      // package on disk; stub it to a no-op so server-side modules can be
      // unit-tested via vitest.
      "server-only": path.resolve(__dirname, "./vitest.server-only-stub.ts"),
    },
  },
});
