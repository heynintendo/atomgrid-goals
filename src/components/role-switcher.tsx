"use client";

import { useTransition } from "react";
import { Check, ChevronDown, LogIn, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setDemoSession } from "@/lib/actions/session";
import { cn } from "@/lib/utils";

export type Identity = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "MANAGER" | "ADMIN";
  department: { name: string } | null;
};

interface RoleSwitcherProps {
  current: Identity | null;
  identities: Identity[]; // the 3 anointed demo identities
  others: Identity[];     // every other seeded user, sorted by role then name
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

function groupByRole(users: Identity[]) {
  const groups: Record<Identity["role"], Identity[]> = {
    ADMIN: [],
    MANAGER: [],
    EMPLOYEE: [],
  };
  for (const u of users) groups[u.role].push(u);
  return groups;
}

export function RoleSwitcher({
  current,
  identities,
  others,
}: RoleSwitcherProps) {
  const [pending, start] = useTransition();
  const switchTo = (userId: string) =>
    start(async () => {
      await setDemoSession(userId);
    });

  const otherGroups = groupByRole(others);
  const hasOthers = others.length > 0;

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
        {identities.map((u) => (
          <IdentityRow
            key={u.id}
            user={u}
            isCurrent={u.id === current?.id}
            onSelect={() => switchTo(u.id)}
            disabled={pending}
          />
        ))}

        {hasOthers && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2">
                  <Users
                    size={14}
                    strokeWidth={1.75}
                    className="text-text-muted"
                  />
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-text">More identities</span>
                  <span className="text-xs text-text-muted">
                    {others.length} more seeded users grouped by role
                  </span>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  sideOffset={4}
                  alignOffset={-4}
                  className="w-80"
                >
                  <RoleSection
                    label="Admin"
                    users={otherGroups.ADMIN}
                    current={current}
                    pending={pending}
                    onPick={switchTo}
                  />
                  <RoleSection
                    label="Managers"
                    users={otherGroups.MANAGER}
                    current={current}
                    pending={pending}
                    onPick={switchTo}
                    showLeadingSeparator={otherGroups.ADMIN.length > 0}
                  />
                  <RoleSection
                    label="Employees"
                    users={otherGroups.EMPLOYEE}
                    current={current}
                    pending={pending}
                    onPick={switchTo}
                    showLeadingSeparator={
                      otherGroups.ADMIN.length > 0 ||
                      otherGroups.MANAGER.length > 0
                    }
                  />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </>
        )}

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

function RoleSection({
  label,
  users,
  current,
  pending,
  onPick,
  showLeadingSeparator,
}: {
  label: string;
  users: Identity[];
  current: Identity | null;
  pending: boolean;
  onPick: (userId: string) => void;
  showLeadingSeparator?: boolean;
}) {
  if (users.length === 0) return null;
  return (
    <>
      {showLeadingSeparator && <DropdownMenuSeparator />}
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {users.map((u) => (
        <IdentityRow
          key={u.id}
          user={u}
          isCurrent={u.id === current?.id}
          onSelect={() => onPick(u.id)}
          disabled={pending}
        />
      ))}
    </>
  );
}

function IdentityRow({
  user,
  isCurrent,
  onSelect,
  disabled,
}: {
  user: Identity;
  isCurrent: boolean;
  onSelect: () => void;
  disabled: boolean;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      disabled={disabled}
      className={cn("gap-3 py-2")}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-surface-2 font-mono text-xs font-medium text-text-secondary">
        {initials(user.name)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium text-text">{user.name}</span>
        <span className="truncate text-xs text-text-muted">
          {secondary(user)}
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
}
