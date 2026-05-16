import { MobileNav } from "@/components/mobile-nav";
import { BrandMark } from "@/components/sidebar";
import { RoleSwitcher, type Identity } from "@/components/role-switcher";
import { SystemDatePill } from "@/components/system-date-pill";
import {
  getAllIdentities,
  getCurrentUser,
  getDemoIdentities,
} from "@/lib/auth";

const ANOINTED_EMAILS = ["admin@demo", "mgr@demo", "emp@demo"];

// Top bar inside the (app) shell.
//   Desktop (≥md): empty left, [date-pill] [role-switcher] on the right.
//                  Brand mark lives in the persistent sidebar.
//   Mobile (<md):  [hamburger] [brand mark] on the left, [role-switcher] right.
//                  Date pill hidden to save horizontal space.
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

  const others = all.filter((u) => !ANOINTED_EMAILS.includes(u.email));

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-surface-1/95 px-3 backdrop-blur-sm md:justify-end md:px-6">
      {/* Mobile: hamburger + brand mark.  Desktop: nothing here. */}
      <div className="flex items-center gap-2 md:hidden">
        <MobileNav role={current?.role ?? null} />
        <BrandMark className="h-auto border-b-0 px-1 py-0" />
      </div>

      {/* Right side — always visible.  Date pill hides on mobile to fit. */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:flex">
          <SystemDatePill />
        </span>
        <RoleSwitcher
          current={currentIdentity}
          identities={anointed}
          others={others}
        />
      </div>
    </header>
  );
}
