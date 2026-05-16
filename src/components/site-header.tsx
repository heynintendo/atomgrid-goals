import { RoleSwitcher, type Identity } from "@/components/role-switcher";
import { SystemDatePill } from "@/components/system-date-pill";
import { getCurrentUser, getDemoIdentities } from "@/lib/auth";

// Top bar inside the (app) shell.  The brand mark lives in the sidebar now,
// so this header carries only the time-travel pill + role-switcher.
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
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-border bg-surface-1/95 px-6 backdrop-blur-sm">
      <SystemDatePill />
      <RoleSwitcher current={currentIdentity} identities={identities} />
    </header>
  );
}
