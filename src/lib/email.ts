import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";

// Single point of contact for transactional email.  All sendEmail()
// callers ignore the return value — a failed email must NEVER block
// the user action that triggered it (a sheet submission still
// succeeds even if the courtesy email to the manager fails).
//
// The recipient is hardcoded via RESEND_TO_EMAIL for hackathon scope so
// judges don't get email spam from any test interactions; in
// production this would resolve user.email at call-time.

interface SendEmailInput {
  // Human-readable description of which transaction this is — surfaced
  // in console logs so a tail of the runtime log shows what fired.
  kind:     string;
  subject:  string;
  // React Email element; rendered server-side by the Resend SDK.
  react:    ReactElement;
  // Optional override of the hardcoded RESEND_TO_EMAIL recipient — used
  // by tests; never set in production callers.
  toOverride?: string;
}

// Module-level Resend client.  When RESEND_API_KEY is unset (e.g.,
// during local development or a Tier-2 fallback deploy without the
// env var) we surface a sentinel value so sendEmail() short-circuits
// without spraying meaningless errors.
const resendClient =
  process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

// Resend free-tier ceiling is 2 requests per second.  Firing a bigger
// fan-out batch in parallel (e.g. an L1+L2 cron wave with 9 sends)
// trips HTTP 429s and silently drops most messages.  pacedSettled
// serialises the calls with a small gap so we stay just under the
// limit without paying for paid-tier throughput.
//
// Takes thunks (not pre-started promises) so each network call only
// starts when its slot is up; Promise.allSettled's semantics are
// preserved — every thunk runs, one failure cannot cancel a sibling,
// and the caller sees per-send status.
const PACE_GAP_MS = 600;

export async function pacedSettled<T>(
  factories: Array<() => Promise<T>>,
  gapMs:     number = PACE_GAP_MS,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < factories.length; i++) {
    try {
      const value = await factories[i]();
      results.push({ status: "fulfilled", value });
    } catch (reason) {
      results.push({ status: "rejected", reason });
    }
    if (i < factories.length - 1) {
      await new Promise((r) => setTimeout(r, gapMs));
    }
  }
  return results;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!resendClient) {
    console.log(`[email/${input.kind}] skipped — RESEND_API_KEY not set`);
    return;
  }
  const to = input.toOverride ?? process.env.RESEND_TO_EMAIL;
  if (!to) {
    console.log(`[email/${input.kind}] skipped — RESEND_TO_EMAIL not set`);
    return;
  }
  try {
    const { data, error } = await resendClient.emails.send({
      from:    FROM,
      to:      [to],
      subject: input.subject,
      react:   input.react,
    });
    if (error) {
      console.error(`[email/${input.kind}] resend error`, error);
      return;
    }
    console.log(`[email/${input.kind}] sent ${data?.id} to ${to}`);
  } catch (err) {
    // Network / SDK throw — log and swallow so callers don't see it.
    console.error(`[email/${input.kind}] threw`, err);
  }
}
