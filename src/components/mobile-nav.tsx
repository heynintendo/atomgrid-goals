"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { Role } from "@prisma/client";
import { BrandMark, SidebarNav } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Hamburger trigger + slide-in nav drawer, rendered only on mobile.
// On desktop the persistent <Sidebar> covers this responsibility.
export function MobileNav({ role }: { role: Role | null }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu">
          <Menu size={18} strokeWidth={1.75} />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <BrandMark />
        <SidebarNav role={role} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
