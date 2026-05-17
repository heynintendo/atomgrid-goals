// Smooth-scroll provider intentionally inert.  The original
// Lenis-based implementation (added during H20 brand integration) was
// disabled after manual testing surfaced wheel-event conflicts: the
// page would jump mid-route on the first scroll and become
// unresponsive on subsequent scrolls, especially on data-heavy routes
// like /reports/completion.
//
// Native browser scroll is what judges will encounter 99% of the time
// and matches every standard SaaS app's behaviour.  Polish over a
// usability regression is the wrong trade.
//
// The component is kept as a passthrough rather than deleted so the
// import in src/app/layout.tsx stays valid without a code change
// rollback if we ever want to revisit smooth-scroll with a different
// library (or a tuned Lenis config).
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
