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
      {/* Skip-link — first focusable element so keyboard users can
          jump straight to <main>.  Styles in globals.css under
          .skip-link (hidden until :focus-visible). */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Sidebar role={user?.role ?? null} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <TimeTravelBanner />
        <main id="main-content" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
