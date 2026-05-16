"use client";

import { useTransition } from "react";
import { Check, ChevronDown, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setDemoSession } from "@/lib/actions/session";

export type Identity = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
  department: { name: string } | null;
};

interface RoleSwitcherProps {
  current: Identity | null;
  identities: Identity[];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleLabel(role: Identity["role"]) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function secondary(u: Identity) {
  const parts = [u.email, roleLabel(u.role)];
  if (u.department) parts.push(u.department.name);
  return parts.join(" · ");
}

export function RoleSwitcher({ current, identities }: RoleSwitcherProps) {
  const [pending, start] = useTransition();
  const switchTo = (userId: string) =>
    start(async () => {
      await setDemoSession(userId);
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Switch demo identity"
          variant="secondary"
          size="md"
          disabled={pending}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-surface-2 font-mono text-[10px] font-medium text-text-secondary">
            {current ? initials(current.name) : "?"}
          </span>
          <span className="max-w-[160px] truncate">
            {current?.name ?? "Not signed in"}
          </span>
          <ChevronDown
            size={14}
            strokeWidth={1.75}
            className="text-text-muted"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Switch demo identity</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {identities.map((u) => {
          const isCurrent = u.id === current?.id;
          return (
            <DropdownMenuItem
              key={u.id}
              onSelect={() => switchTo(u.id)}
              disabled={pending}
              className="gap-3 py-2"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2 font-mono text-xs font-medium text-text-secondary">
                {initials(u.name)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-text">{u.name}</span>
                <span className="truncate text-xs text-text-muted">
                  {secondary(u)}
                </span>
              </div>
              {isCurrent && (
                <Check
                  size={14}
                  strokeWidth={1.75}
                  className="shrink-0 text-brand"
                  aria-label="current"
                />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="gap-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2">
            <LogIn
              size={14}
              strokeWidth={1.75}
              className="text-text-muted"
            />
          </span>
          <div className="flex flex-col">
            <span className="font-medium text-text">
              Sign in with Microsoft
            </span>
            <span className="text-xs text-text-muted">
              Real Entra ID SSO — wired in H19
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
