"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Stays in client console for the user; server log is captured by Next's
    // error reporter via the digest field.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
          Boundary caught the error
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-text">
          Something broke on this screen
        </h2>
        <p className="mt-3 text-sm text-text-secondary">
          The error reached the boundary cleanly — the rest of the app is
          unaffected and you can keep working in another route.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-text-muted">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button onClick={reset} variant="primary">
            <RotateCw size={14} strokeWidth={1.75} />
            Reload this screen
          </Button>
        </div>
      </div>
    </div>
  );
}
