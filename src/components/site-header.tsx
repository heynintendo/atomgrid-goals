import { RoleSwitcher, type Identity } from "@/components/role-switcher";
import { getCurrentUser, getDemoIdentities } from "@/lib/auth";

// Top bar used by the root layout.  H6 will expand the page chrome into a
// proper sidebar + header app shell; for now this is the surface that
// carries the role-switcher.
export async function SiteHeader() {
  const [current, identities] = await Promise.all([
    getCurrentUser(),
    getDemoIdentities(),
  ]);

  const currentIdentity: Identity | null = current
    ? {
        id: current.id,
        name: current.name,
        email: current.email,
        role: current.role,
        department: current.department
          ? { name: current.department.name }
          : null,
      }
    : null;

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-1 px-6">
      <div className="flex items-baseline gap-2">
        <span className="h-2 w-2 self-center rounded-sm bg-brand" />
        <span className="ml-1 text-base font-semibold tracking-tight text-text">
          AtomGrid
        </span>
        <span className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Goals
        </span>
      </div>
      <RoleSwitcher current={currentIdentity} identities={identities} />
    </header>
  );
}
