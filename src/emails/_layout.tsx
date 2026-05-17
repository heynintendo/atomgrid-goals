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

// Shared chrome for every transactional template.  Email clients can't
// load custom fonts reliably and ignore most CSS variables, so brand
// colours and the font stack are hardcoded inline.  Mirrors globals.css
// so the email reads as a continuation of the in-app surface.

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
  brand:      "#0F5132",
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
          <Section style={{ marginBottom: 24 }}>
            {/* Logo + "Goals" sub-label.  AtomGrid wordmark is the
                public-served SVG so email clients (most of which load
                external images) can render the brand mark.  Alt text
                falls back to the AtomGrid text for image-blocked
                clients. */}
            <table cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ verticalAlign: "middle", paddingRight: 10 }}>
                    <img
                      src="https://atomgrid-goals.vercel.app/atomgrid-logo.svg"
                      alt="AtomGrid"
                      width={140}
                      height={26}
                      style={{ display: "block" }}
                    />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <span
                      style={{
                        fontFamily:    "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize:      11,
                        letterSpacing: "0.12em",
                        color:         COLORS.textFaint,
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

          <Hr
            style={{ borderColor: COLORS.border, margin: "24px 0 16px 0" }}
          />
          <Text
            style={{
              fontSize:   12,
              lineHeight: "18px",
              color:      COLORS.textFaint,
              margin:     0,
            }}
          >
            AtomGrid Goal Setting &amp; Tracking Portal · transactional notice
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
