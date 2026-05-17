"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Replicates atomgrid.in's weighted smooth-scroll feel via Lenis.  The
// corporate site uses Lenis 0.2.28 from a CDN; we install via npm
// (1.3.23 at time of writing) which has the same easing semantics plus
// the orientation API.
//
// Touch is intentionally NOT smooth — Lenis on iOS/Android feels
// laggier than the platform's native momentum.  Desktop wheel +
// trackpad get the weighted ease.
//
// Modals are expected to call `window.__lenis?.stop()` / `.start()`
// around opens so the page doesn't scroll behind a backdrop.  See
// D14 of the H20 spec.
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Skip smooth-wheel below the desktop breakpoint — H20.D18 spec.
    const enableSmoothWheel = typeof window !== "undefined" && window.innerWidth >= 1024;

    const lenis = new Lenis({
      duration:        1.2,
      // Exponential ease-out (Lenis's documented default for the
      // "corporate weighted" feel).  Pulled in inline so the curve is
      // visible at the integration site.
      easing:          (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel:     enableSmoothWheel,
      touchMultiplier: 1.4,
    });

    // Expose globally so Dialog/Sheet handlers (Phase D14) can pause
    // body scroll without re-importing the singleton.
    (window as Window & { __lenis?: Lenis }).__lenis = lenis;

    let rafId = 0;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete (window as Window & { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return <>{children}</>;
}
