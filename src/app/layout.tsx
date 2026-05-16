import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AtomGrid · Goals",
  description: "Goal setting and tracking for high-trust teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface-1 !text-text !border !border-border !rounded-lg !shadow-popover",
              title: "!text-sm !font-medium !text-text",
              description: "!text-xs !text-text-secondary",
              actionButton: "!bg-brand !text-white !rounded-md",
              cancelButton: "!bg-surface-2 !text-text !rounded-md",
              closeButton:
                "!bg-surface-2 !border-border !text-text-muted hover:!text-text",
              success:
                "[&_[data-icon]]:!text-brand [&_[data-icon]_svg]:!stroke-brand",
              error:
                "[&_[data-icon]]:!text-danger [&_[data-icon]_svg]:!stroke-danger",
            },
          }}
        />
      </body>
    </html>
  );
}
