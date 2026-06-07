import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";
import { APP_URL } from "@/lib/app-url";

// Shared chrome for every transactional template.  Email clients can't
// load custom fonts reliably and ignore most CSS variables, so brand
// colours and the font stack are hardcoded inline.  Mirrors globals.css
// (Atomberg: near-black + amber on white) so the email reads as a
// continuation of the in-app surface.

interface BrandLayoutProps {
  // 1-line preview rendered by inboxes underneath the subject.
  preview: string;
  // Eyebrow shown above the main heading (e.g., "FY2026 · GOAL SETTING").
  eyebrow: string;
  // Bold heading at the top of the card.
  heading: string;
  children: ReactNode;
}

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const COLORS = {
  canvas:     "#FBFAF7",
  surface:    "#FFFFFF",
  border:     "#E8E5DF",
  text:       "#1A1A1A",
  textMuted:  "#54514B",
  textFaint:  "#8A8680",
  ink:        "#1A1A1A",   // near-black header strip (mirrors atomberg.com's footer)
  onInkFaint: "#A8A29E",   // muted label colour on the dark strip
  brand:      "#FCB40C",   // Atomberg amber — accent only (divider, link underline, button bg)
};

export function BrandLayout({
  preview,
  eyebrow,
  heading,
  children,
}: BrandLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.canvas,
          fontFamily:      FONT_STACK,
          margin:          0,
          padding:         "32px 16px",
        }}
      >
        <Container
          style={{
            backgroundColor: COLORS.surface,
            border:          `1px solid ${COLORS.border}`,
            borderRadius:    8,
            maxWidth:        560,
            margin:          "0 auto",
            padding:         "32px",
          }}
        >
          {/* Dark header strip — mirrors atomberg.com's near-black footer:
              the knockout logo (white wordmark + amber badge, a transparent
              PNG so no white box shows on the dark fill) on #1A1A1A,
              full-bleed by cancelling the container's 32px padding.  Absolute
              URL via APP_URL so it resolves in an inbox and survives the
              Vercel project rename; alt text falls back to "Atomberg" for
              image-blocked clients. */}
          <Section
            style={{
              backgroundColor:      COLORS.ink,
              margin:               "-32px -32px 24px -32px",
              padding:              "20px 32px",
              borderTopLeftRadius:  8,
              borderTopRightRadius: 8,
            }}
          >
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", paddingRight: 10 }}>
                    <img
                      src={`${APP_URL}/atomberg-logo-dark.png`}
                      alt="Atomberg"
                      width={120}
                      height={30}
                      style={{ display: "block" }}
                    />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span
                      style={{
                        fontFamily:    "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize:      11,
                        letterSpacing: "0.12em",
                        color:         COLORS.onInkFaint,
                        textTransform: "uppercase",
                      }}
                    >
                      Goals
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Text
            style={{
              fontFamily:    "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize:      11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color:         COLORS.textFaint,
              margin:        "0 0 6px 0",
            }}
          >
            {eyebrow}
          </Text>
          <Text
            style={{
              fontSize:     20,
              fontWeight:   600,
              lineHeight:   "28px",
              color:        COLORS.text,
              margin:       "0 0 16px 0",
              letterSpacing: "-0.01em",
            }}
          >
            {heading}
          </Text>

          {children}

          {/* Amber accent rule — Atomberg's signature highlight.  2px so it
              reads as deliberate brand trim, not a faint hairline. */}
          <Hr
            style={{
              border:          "none",
              borderTop:       `2px solid ${COLORS.brand}`,
              margin:          "24px 0 16px 0",
            }}
          />
          <Text
            style={{
              fontSize:   12,
              lineHeight: "18px",
              color:      COLORS.textFaint,
              margin:     0,
            }}
          >
            Atomberg Goal Setting &amp; Tracking Portal · transactional notice
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailTheme = {
  fontStack: FONT_STACK,
  colors:    COLORS,
};

export function Para({ children }: { children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize:   14,
        lineHeight: "22px",
        color:      COLORS.textMuted,
        margin:     "0 0 12px 0",
      }}
    >
      {children}
    </Text>
  );
}

export function Highlight({ children }: { children: ReactNode }) {
  return (
    <span style={{ color: COLORS.text, fontWeight: 500 }}>{children}</span>
  );
}
