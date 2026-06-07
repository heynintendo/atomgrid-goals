"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { setDemoSession } from "@/lib/actions/session";
import { cn } from "@/lib/utils";
import type { Identity } from "@/components/role-switcher";

interface LoginActionsProps {
  identities: Identity[];
}

const ROLE_LABEL: Record<Identity["role"], string> = {
  ADMIN:    "Admin",
  MANAGER:  "Manager",
  EMPLOYEE: "Employee",
};

export function LoginActions({ identities }: LoginActionsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function pickDemo(userId: string) {
    startTransition(async () => {
      await setDemoSession(userId);
      router.push("/");
    });
  }

  return (
    // suppressHydrationWarning on the root because the action buttons
    // each carry a `pending` state derived from useTransition() which
    // can flicker briefly on hydration and cause a className mismatch
    // axe-core flags as a runtime warning.  The visual output is
    // identical between server (pending=false) and client (also
    // pending=false until interaction), so suppression is correct.
    <div className="space-y-6" suppressHydrationWarning>
      <section className="space-y-3">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Demo identities
        </p>
        <div className="space-y-2">
          {identities.map((id) => (
            <button
              key={id.id}
              type="button"
              onClick={() => pickDemo(id.id)}
              disabled={pending}
              className={cn(
                "w-full rounded-md border border-border bg-surface-1 px-4 py-3 text-left transition-colors duration-[120ms]",
                "hover:bg-surface-hover hover:border-border-hover",
                "disabled:opacity-60",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text">{id.name}</p>
                  <p className="font-mono text-xs text-text-muted">{id.email}</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
                  {ROLE_LABEL[id.role]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <section className="space-y-3">
        <Button
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => signIn("microsoft-entra-id", { callbackUrl: "/" })}
        >
          <MicrosoftLogo />
          Sign in with Microsoft
        </Button>
        <p className="font-mono text-xs text-text-muted">
          Real Entra ID OAuth. First sign-in provisions a fresh
          EMPLOYEE-role User in the database.
        </p>
      </section>
    </div>
  );
}

// 4-square Microsoft brandmark — sized to sit alongside the button's
// 14px label without overpowering it.  Each square uses the canonical
// Microsoft accent (red/green/blue/yellow) — semantic, not part of
// Atomberg's palette.
function MicrosoftLogo() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="0" y="0" width="7"  height="7"  fill="#F25022" />
      <rect x="8" y="0" width="7"  height="7"  fill="#7FBA00" />
      <rect x="0" y="8" width="7"  height="7"  fill="#00A4EF" />
      <rect x="8" y="8" width="7"  height="7"  fill="#FFB900" />
    </svg>
  );
}
