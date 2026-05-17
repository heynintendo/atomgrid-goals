"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { Logo } from "@/components/brand/logo";
import { NAV_BY_ROLE, ROLE_DESCRIPTIONS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role | null;
}

// Desktop persistent aside (≥768px).  Mobile users get the same nav via
// MobileNav, which renders <SidebarNav> inside a Sheet.
export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface-1 lg:flex">
      <BrandMark />
      <SidebarNav role={role} />
    </aside>
  );
}

// Brand mark exported so the MobileNav sheet and any future home links
// share the same markup.
export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="AtomGrid Goals — home"
      className={cn(
        "flex h-14 items-center gap-3 border-b border-border px-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        className,
      )}
    >
      <Logo size={26} />
      <span aria-hidden className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-muted">
        Goals
      </span>
    </Link>
  );
}

interface SidebarNavProps {
  role: Role | null;
  onNavigate?: () => void; // called when an item is clicked — used by mobile sheet to close
}

// Nav content — shared between Sidebar (desktop aside) and MobileNav (sheet).
// Lives on its own so the sheet doesn't have to duplicate the section /
// link / footer structure.
export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const sections = role ? NAV_BY_ROLE[role] : [];
  // Longest-href-match wins so /manager/approvals lights up Approvals only,
  // not its parent /manager.
  const activeHref = pickActiveHref(pathname, sections);

  return (
    <>
      <nav className="flex-1 overflow-y-auto p-3">
        {sections.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.label} className="space-y-1">
                <div className="px-2 py-1.5 font-mono text-xs uppercase tracking-wider text-text-muted">
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={item.href === activeHref}
                    onClick={onNavigate}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-3">
        {role ? (
          <p className="px-2 text-xs text-text-muted">
            {ROLE_DESCRIPTIONS[role]}
          </p>
        ) : (
          <p className="px-2 text-xs text-text-muted">
            Pick a demo identity from the top right to populate the nav.
          </p>
        )}
      </div>
    </>
  );
}

function SidebarLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      // active is derived from usePathname() which only resolves on
      // the client.  Server renders every link as inactive, then
      // client re-renders with one active — that's a React 19
      // hydration warning we don't want spamming the console.
      // suppressHydrationWarning here scopes the suppression to the
      // exact attribute that legitimately differs (className), not
      // the surrounding tree.
      suppressHydrationWarning
      className={cn(
        // 2px brand-primary left edge on active state per H20.D8 spec;
        // negative margin keeps the label text-position constant
        // between active / inactive so the row doesn't shift.
        "group relative flex h-9 items-center gap-2.5 rounded-md pl-3 pr-3 text-sm transition-colors duration-100 ease-[var(--ease-brand)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        active
          ? "bg-brand-primary-subtle text-text-heading font-semibold before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-r-sm before:bg-brand-primary"
          : "text-text-secondary font-medium hover:bg-surface-hover hover:text-text",
      )}
    >
      <Icon
        size={16}
        strokeWidth={1.5}
        className={cn(
          "shrink-0",
          active ? "text-text-heading" : "text-text-muted group-hover:text-text",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
        No identity
      </p>
      <p className="mt-2 text-sm text-text-secondary">
        Open the dropdown in the top right and pick Priya, Karthik, or Riya to
        see the nav for that role.
      </p>
    </div>
  );
}

// Returns the href of the nav item that best matches the current pathname.
// Each item contributes its href plus any additional matchPaths; "best" is
// the longest matching candidate (so /manager doesn't shadow /manager/approvals,
// and /employee/check-in/Q1 lights up Check-ins via the matchPaths entry).
function pickActiveHref(
  pathname: string,
  sections: { items: { href: string; matchPaths?: string[] }[] }[],
): string | null {
  let best: { href: string; matchLen: number } | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      const candidates = [item.href, ...(item.matchPaths ?? [])];
      for (const c of candidates) {
        const matches =
          c === "/"
            ? pathname === "/"
            : pathname === c || pathname.startsWith(`${c}/`);
        if (!matches) continue;
        if (best == null || c.length > best.matchLen) {
          best = { href: item.href, matchLen: c.length };
        }
      }
    }
  }
  return best?.href ?? null;
}
