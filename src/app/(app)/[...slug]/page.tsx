import { Construction } from "lucide-react";

// Catch-all for sidebar routes that haven't shipped yet.  Beaten by every
// explicit page.tsx (e.g. once H7 lands /employee/goal-sheet/page.tsx, that
// route hits the real editor instead of this stub).

export default async function ComingSoon({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = "/" + slug.join("/");

  return (
    <div className="mx-auto max-w-3xl p-12">
      <div className="rounded-lg border border-dashed border-border bg-surface-1 p-12 text-center">
        <Construction
          size={28}
          strokeWidth={1.5}
          aria-hidden
          className="mx-auto text-text-muted"
        />
        <p className="mt-4 font-mono text-xs uppercase tracking-wider text-text-muted">
          Coming soon
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-text">
          {path}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary">
          This route is on the build order. The shell is wired so the sidebar
          stays navigable while the page itself ships in a later hour.
        </p>
      </div>
    </div>
  );
}
