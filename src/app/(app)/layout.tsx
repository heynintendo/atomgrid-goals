import { Sidebar } from "@/components/sidebar";
import { SiteHeader } from "@/components/site-header";
import { TimeTravelBanner } from "@/components/time-travel-banner";
import { getCurrentUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen">
      <Sidebar role={user?.role ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TimeTravelBanner />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
