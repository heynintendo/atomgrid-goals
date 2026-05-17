import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  // Pixel height of the rendered wordmark.  Width is derived from the
  // logo's native 1597:301 aspect ratio.
  size?:      number;
  className?: string;
  // When true, renders as a plain <img> (no Next/Image optimisation).
  // Used in email-shell-style server components that don't go through
  // the Next runtime.
  raw?:       boolean;
}

const ASPECT  = 1597 / 301;      // native viewBox ratio
const DEFAULT = 32;              // sidebar / topbar default

// Official AtomGrid wordmark.  The SVG ships in public/atomgrid-logo.svg
// and embeds the brand-logo green (#94C240) directly — kept distinct
// from --color-brand-primary (#A4D845, lighter, used for CTAs).
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
        src="/atomgrid-logo.svg"
        alt="AtomGrid"
        width={width}
        height={height}
        className={cn("select-none", className)}
        draggable={false}
      />
    );
  }
  return (
    <Image
      src="/atomgrid-logo.svg"
      alt="AtomGrid"
      width={width}
      height={height}
      priority
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
