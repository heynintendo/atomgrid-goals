import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev route-status badge — it overlaps the sidebar footer
  // in screenshots and adds nothing for our workflow.
  devIndicators: false,
  // Silence dev-only Turbopack issue noise originating from node_modules
  // (we've confirmed `next build` is clean — these are HMR-time info events
  // from third-party packages, not real app errors).
  turbopack: {
    ignoreIssue: [{ path: "**/node_modules/**" }],
  },
};

export default nextConfig;
