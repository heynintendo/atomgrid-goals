import { BrandLayout, Highlight, Para } from "./_layout";

interface EscalationL1EmailProps {
  employeeName:       string;
  managerName:        string;
  period:             string;
  windowClosedDateISO: string; // formatted "2026-10-01" or similar
}

// Fires when the daily cron creates a new Level 1 (MANAGER) escalation
// because an employee's check-in window closed without a submission.
export function EscalationL1Email({
  employeeName,
  managerName,
  period,
  windowClosedDateISO,
}: EscalationL1EmailProps) {
  return (
    <BrandLayout
      preview={`Action required: ${employeeName} has not submitted their ${period} check-in.`}
      eyebrow={`${period} · ACTION REQUIRED`}
      heading="A team check-in is overdue"
    >
      <Para>Hi {managerName},</Para>
      <Para>
        <Highlight>{employeeName}</Highlight> has not submitted their{" "}
        <Highlight>{period}</Highlight> check-in. The check-in window
        closed on <Highlight>{windowClosedDateISO}</Highlight>.
      </Para>
      <Para>
        Reach out, then resolve the escalation in the admin or team
        escalations view once the check-in lands. If this stays
        unresolved for seven calendar days, the escalation chain
        advances to skip-level (admin) automatically.
      </Para>
    </BrandLayout>
  );
}

export default EscalationL1Email;
