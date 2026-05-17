// Auth.js v5 mounts its built-in handlers (sign-in, callback, sign-out,
// CSRF, session) under /api/auth/*.  Re-export from the central
// configuration so this file stays a thin shim.
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
