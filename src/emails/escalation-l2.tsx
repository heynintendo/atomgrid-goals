import { BrandLayout, Highlight, Para } from "./_layout";

interface EscalationL2EmailProps {
  adminName:    string;
  managerName:  string;
  employeeName: string;
  period:       string;
}

// Fires when the daily cron promotes an unresolved L1 to L2 (SKIP_LEVEL).
// In this hackathon the L2 audience is admin Priya.  Production would
// route to the actual skip-level manager when org-graph traversal is
// wired.
export function EscalationL2Email({
  adminName,
  managerName,
  employeeName,
  period,
}: EscalationL2EmailProps) {
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

export default EscalationL2Email;
