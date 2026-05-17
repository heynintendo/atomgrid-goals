"use client";

import { useState } from "react";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { Role } from "@prisma/client";
import { BrandMark, SidebarNav } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Hamburger trigger + slide-in nav drawer rendered <lg (under 1024px).
// On desktop the persistent <Sidebar> covers this responsibility.
//
// Closes itself on route change (subscribing to usePathname()) so the
// drawer doesn't linger over the destination page after the user picks
// a nav item.  Sheet primitive supplies Esc + backdrop-click close,
// plus Radix's body scroll lock keeps the page from scrolling behind
// the open drawer.
export function MobileNav({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on navigation.  The onNavigate callback also closes
  // immediately on click; this is the belt-and-suspenders for any
  // route change that didn't originate from a sidebar link (e.g., a
  // server-action redirect).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu">
          <Menu size={20} strokeWidth={1.5} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0">
        <BrandMark />
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
