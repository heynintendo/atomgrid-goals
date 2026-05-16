import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev route-status badge — it overlaps the sidebar footer
  // in screenshots and adds nothing for our workflow.
  devIndicators: false,
};

export default nextConfig;
