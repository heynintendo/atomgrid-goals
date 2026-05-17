import { BrandLayout, Highlight, Para } from "./_layout";

interface EscalationL1EmailProps {
  audience:            "manager" | "employee";
  employeeName:        string;
  managerName:         string;
  period:              string;
  windowClosedDateISO: string; // formatted "2026-10-01" or similar
}

// Fires when the daily cron creates a new Level 1 (MANAGER) escalation
// because an employee's check-in window closed without a submission.
// Sent to BOTH the manager (action required) and the employee (heads-up
// that it has been escalated up the chain).
export function EscalationL1Email({
  audience,
  employeeName,
  managerName,
  period,
  windowClosedDateISO,
}: EscalationL1EmailProps) {
  if (audience === "manager") {
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

  // Employee-facing variant — informational, not punitive.  Tells them
  // their sheet is on the escalation register and points at their
  // manager as the resolution path.
  return (
    <BrandLayout
      preview={`Your ${period} goal sheet has been escalated.`}
      eyebrow={`${period} · ESCALATION NOTICE`}
      heading="Your check-in is on the escalation register"
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        Your <Highlight>{period}</Highlight> check-in was not submitted
        before the window closed on{" "}
        <Highlight>{windowClosedDateISO}</Highlight>, so an escalation
        has been raised to your manager{" "}
        <Highlight>{managerName}</Highlight>.
      </Para>
      <Para>
        Submit your check-in as soon as possible to clear the
        escalation. If it stays unresolved for seven calendar days, the
        chain advances to skip-level (admin) review.
      </Para>
    </BrandLayout>
  );
}

export default EscalationL1Email;
