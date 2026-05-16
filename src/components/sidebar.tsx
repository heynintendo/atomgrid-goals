"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { NAV_BY_ROLE, ROLE_DESCRIPTIONS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  role: Role | null;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const sections = role ? NAV_BY_ROLE[role] : [];

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface-1 md:flex">
      {/* Brand */}
      <Link
        href="/"
        className="flex h-14 items-center gap-2 border-b border-border px-4"
      >
        <span className="h-2 w-2 rounded-sm bg-brand" />
        <span className="text-base font-semibold tracking-tight text-text">
          AtomGrid
        </span>
        <span className="ml-1 font-mono text-xs uppercase tracking-wider text-text-muted">
          Goals
        </span>
      </Link>

      {/* Nav */}
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
                    active={isActive(pathname, item.href)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Footer hint */}
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
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2 rounded-sm pl-2 pr-3 text-sm transition-colors duration-[120ms] ease-[var(--ease-brand)]",
        active
          ? "bg-surface-hover text-text"
          : "text-text-secondary hover:bg-surface-hover hover:text-text",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          active ? "bg-brand" : "bg-transparent",
        )}
      />
      <Icon
        size={14}
        strokeWidth={1.75}
        className={cn(
          "shrink-0",
          active ? "text-text" : "text-text-muted group-hover:text-text",
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

// Active-route matching: an item is active when the current pathname matches
// its href exactly, OR when the pathname is a sub-route under the item's href
// (e.g. /admin/users/123 should activate /admin/users).  The root href "/" is
// strict-match only to avoid lighting up every page.
function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
