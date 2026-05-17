import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

// Role-aware home redirect.  Replaces the H2 design-system sandbox
// which had been carrying 23 of the audit's 33 moderate a11y findings
// (missing landmarks, duplicate main, etc.) because it didn't render
// through the app shell properly.
//
// Anonymous → /login
// Employee  → /employee/goal-sheet
// Manager   → /manager/approvals
// Admin     → /admin/audit-log  (closest thing admins do daily)
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  switch (user.role) {
    case Role.EMPLOYEE: redirect("/employee/goal-sheet");
    case Role.MANAGER:  redirect("/manager/approvals");
    case Role.ADMIN:    redirect("/admin/audit-log");
  }
}
