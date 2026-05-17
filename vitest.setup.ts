// Loads .env before any test module imports.  Node 22's built-in
// process.loadEnvFile() — no dotenv dependency.  The try/catch keeps
// pure-logic test runs working in environments without a .env file
// (CI without secrets, for example).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env present.  DB-touching tests will fail at the first query
  // with a clearer error; pure-logic tests run regardless.
}
