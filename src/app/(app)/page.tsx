import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";

// Role-aware home redirect.  Each role lands on their own Overview
// dashboard which carries the KPI hero + chart + activity feed.
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  switch (user.role) {
    case Role.EMPLOYEE: redirect("/employee");
    case Role.MANAGER:  redirect("/manager");
    case Role.ADMIN:    redirect("/admin");
  }
}
