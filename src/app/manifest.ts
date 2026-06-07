import type { MetadataRoute } from "next";

// PWA manifest.  theme_color is Atomberg near-black (#1A1A1A), NOT the amber
// brand accent: theme_color tints the mobile browser chrome / status bar, where
// amber would be garish and fail contrast against the status-bar icons.
// Near-black matches Atomberg's dark header/footer and keeps white status icons
// crisp.  background_color is the app canvas (white).
//
// Icon: the square "a" badge.  The supplied brand asset is a wide wordmark, so
// the badge is the only square mark available — fine for favicon-tier sizes;
// a dedicated 192/512px maskable icon would be a nice future addition.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             "Atomberg Goals",
    short_name:       "Atomberg",
    description:      "Goal setting and tracking for high-trust teams.",
    start_url:        "/",
    display:          "standalone",
    background_color: "#FFFFFF",
    theme_color:      "#1A1A1A",
    icons: [
      { src: "/atomberg-icon.png", sizes: "117x117", type: "image/png", purpose: "any" },
    ],
  };
}
