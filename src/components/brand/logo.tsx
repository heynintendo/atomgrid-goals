import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  // Pixel height of the rendered wordmark.  Width is derived from the
  // logo's native 556:139 (~4:1) aspect ratio.
  size?:      number;
  className?: string;
  // When true, renders as a plain <img> (no Next/Image optimisation).
  // Used in email-shell-style server components that don't go through
  // the Next runtime.
  raw?:       boolean;
}

const ASPECT  = 556 / 139;       // native ratio of public/atomberg-logo.png (~4:1)
const DEFAULT = 32;              // sidebar / topbar default

// Official Atomberg wordmark (badge + "atomberg" + "Why not?" tagline).
// Ships as a white-background PNG cropped tight to the logo's bounding
// box at public/atomberg-logo.png (556x139).  Width derives from that
// native ratio so the wordmark never squishes.
//
// Use this component anywhere the brand identifies itself: sidebar,
// login page, email headers (via raw=true so the asset URL is
// inline-safe), Open Graph metadata.
export function Logo({ size = DEFAULT, className, raw = false }: LogoProps) {
  const width  = Math.round(size * ASPECT);
  const height = size;
  if (raw) {
    return (
      <img
        src="/atomberg-logo.png"
        alt="Atomberg"
        width={width}
        height={height}
        className={cn("select-none", className)}
        draggable={false}
      />
    );
  }
  return (
    <Image
      src="/atomberg-logo.png"
      alt="Atomberg"
      width={width}
      height={height}
      priority
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
