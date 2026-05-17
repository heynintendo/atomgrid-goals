import { BrandLayout, Highlight, Para } from "./_layout";

interface EscalationL2EmailProps {
  audience:     "admin" | "manager" | "employee";
  adminName:    string;
  managerName:  string;
  employeeName: string;
  period:       string;
}

// Fires when the daily cron promotes an unresolved L1 to L2 (SKIP_LEVEL).
// Three audiences: admin (action), manager (notice that their inaction
// has been surfaced), employee (heads-up that the chain moved up).
export function EscalationL2Email({
  audience,
  adminName,
  managerName,
  employeeName,
  period,
}: EscalationL2EmailProps) {
  if (audience === "admin") {
    return (
      <BrandLayout
        preview={`Skip-level escalation: ${managerName} has not acted on ${employeeName}'s ${period} escalation.`}
        eyebrow={`${period} · SKIP-LEVEL ESCALATION`}
        heading="A Level 1 escalation has aged out"
      >
        <Para>Hi {adminName},</Para>
        <Para>
          <Highlight>{managerName}</Highlight> has not resolved the Level 1
          escalation on <Highlight>{employeeName}</Highlight>&rsquo;s{" "}
          <Highlight>{period}</Highlight> check-in for more than seven
          calendar days.
        </Para>
        <Para>
          Both the Level 1 and the new Level 2 (skip-level) entries are
          visible on the admin escalations register. Reach out to the
          manager directly, then resolve both rows once the underlying
          check-in lands.
        </Para>
      </BrandLayout>
    );
  }

  if (audience === "manager") {
    return (
      <BrandLayout
        preview={`Your team's ${period} compliance is now under admin review.`}
        eyebrow={`${period} · SKIP-LEVEL NOTICE`}
        heading="Your team's compliance is under admin review"
      >
        <Para>Hi {managerName},</Para>
        <Para>
          The Level 1 escalation on{" "}
          <Highlight>{employeeName}</Highlight>&rsquo;s{" "}
          <Highlight>{period}</Highlight> check-in sat unresolved for
          more than seven days, so it has advanced to skip-level review.
          Admin <Highlight>{adminName}</Highlight> has been notified.
        </Para>
        <Para>
          Resolve both the Level 1 and the new Level 2 rows from your
          team escalations view once the underlying check-in lands. The
          chain stops here for the hackathon scope — production would
          continue to HR after another seven days.
        </Para>
      </BrandLayout>
    );
  }

  // Employee variant — informational; tells them their escalation has
  // moved up the chain and is now visible to admin.
  return (
    <BrandLayout
      preview={`Your ${period} sheet has been escalated to admin.`}
      eyebrow={`${period} · ESCALATION ESCALATED`}
      heading="Your check-in has been escalated to admin"
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        Your <Highlight>{period}</Highlight> check-in escalation sat
        unresolved with your manager{" "}
        <Highlight>{managerName}</Highlight> for more than seven days,
        so it has advanced to skip-level review with admin{" "}
        <Highlight>{adminName}</Highlight>.
      </Para>
      <Para>
        Please action this urgently — submit your check-in to clear
        both Level&nbsp;1 and Level&nbsp;2 rows from the escalation
        register at once.
      </Para>
    </BrandLayout>
  );
}

export default EscalationL2Email;
