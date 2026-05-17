import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { LoginActions } from "@/components/login-actions";
import { getCurrentUser, getDemoIdentities } from "@/lib/auth";

// /login surfaces both entry points: the demo role-switcher (primary
// CTA — the path judges use) and a "Sign in with Microsoft" button
// that runs the real Auth.js Entra ID flow.  Already-signed-in users
// are redirected straight to the role-aware home.
export default async function LoginPage() {
  const me = await getCurrentUser();
  if (me) redirect("/");

  const identities = await getDemoIdentities();

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-8">
      <div className="w-full max-w-md space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <span
              aria-hidden
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted"
            >
              Goals
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-text-secondary">
            Pick a demo identity to walk through the portal&rsquo;s
            features, or sign in with a real Microsoft account.
          </p>
        </header>

        <LoginActions identities={identities} />

        <p className="font-mono text-xs text-text-muted">
          AtomGrid Goal Setting &amp; Tracking Portal &middot; AtomQuest 1.0
        </p>
      </div>
    </main>
  );
}
