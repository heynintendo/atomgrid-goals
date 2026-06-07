import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { SmoothScrollProvider } from "@/components/scroll/smooth-scroll-provider";
import { APP_URL } from "@/lib/app-url";
import "./globals.css";

// Poppins — the app UI typeface, a geometric sans.  (Atomberg's exact
// wordmark font is proprietary; Poppins is a close, freely-loadable
// stand-in.)  Weights 400/500/600/700 cover body, UI labels, h3/h4, h1/h2.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Geist Mono retained for tabular numerics + identifier display
// (audit-log IDs, percentages, dates).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title:       "Atomberg · Goals",
  description: "Goal setting and tracking for high-trust teams.",
  icons:       { icon: "/atomberg-icon.png" },
  openGraph: {
    title:       "Atomberg · Goals",
    description: "Goal setting and tracking for high-trust teams.",
    siteName:    "Atomberg Goals",
    url:         "/",
    type:        "website",
    images:      [{ url: "/og-image.png", width: 1200, height: 630, alt: "Atomberg Goals" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Atomberg · Goals",
    description: "Goal setting and tracking for high-trust teams.",
    images:      ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-1 !text-text !border !border-border !rounded-lg !shadow-lg",
              title:       "!text-sm !font-medium !text-text",
              description: "!text-xs !text-text-secondary",
              actionButton:"!bg-brand-primary !text-text-on-primary !rounded-md",
              cancelButton:"!bg-surface-2 !text-text !rounded-md",
              closeButton:
                "!bg-surface-2 !border-border !text-text-muted hover:!text-text",
              success:
                "[&_[data-icon]]:!text-status-success [&_[data-icon]_svg]:!stroke-status-success",
              error:
                "[&_[data-icon]]:!text-status-danger [&_[data-icon]_svg]:!stroke-status-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
