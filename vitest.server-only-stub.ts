// No-op stub for the `server-only` package.  Next.js ships `server-only`
// as a virtual module that throws if pulled into a client bundle; in
// node-side vitest there is no such bundler boundary, so we resolve it
// to nothing.
export {};
