import { RoleSwitcher, type Identity } from "@/components/role-switcher";
import { SystemDatePill } from "@/components/system-date-pill";
import {
  getAllIdentities,
  getCurrentUser,
  getDemoIdentities,
} from "@/lib/auth";

const ANOINTED_EMAILS = ["admin@demo", "mgr@demo", "emp@demo"];

// Top bar inside the (app) shell.  The brand mark lives in the sidebar now,
// so this header carries only the time-travel pill + role-switcher.
export async function SiteHeader() {
  const [current, anointed, all] = await Promise.all([
    getCurrentUser(),
    getDemoIdentities(),
    getAllIdentities(),
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

  // The submenu hides the three anointed identities (they're already at
  // the top of the main dropdown), so the "More identities" submenu lists
  // the other 13 seeded users.
  const others = all.filter((u) => !ANOINTED_EMAILS.includes(u.email));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-3 border-b border-border bg-surface-1/95 px-6 backdrop-blur-sm">
      <SystemDatePill />
      <RoleSwitcher
        current={currentIdentity}
        identities={anointed}
        others={others}
      />
    </header>
  );
}
