import { BrandLayout, Highlight, Para } from "./_layout";

interface CheckInSubmittedEmailProps {
  employeeName: string;
  managerName:  string;
  period:       string; // "Q1", "Q2", "Q3", "Annual"
}

// Fires when an employee logs the last remaining goal for a period
// (i.e., goalsLogged == goalsTotal).  Manager gets the cue to open
// the check-ins view and leave structured feedback.
export function CheckInSubmittedEmail({
  employeeName,
  managerName,
  period,
}: CheckInSubmittedEmailProps) {
  return (
    <BrandLayout
      preview={`${employeeName} submitted their ${period} check-in.`}
      eyebrow={`${period} · CHECK-IN SUBMITTED`}
      heading="A check-in is ready for your feedback"
    >
      <Para>Hi {managerName},</Para>
      <Para>
        <Highlight>{employeeName}</Highlight> submitted their{" "}
        <Highlight>{period}</Highlight> check-in. All goals for the period
        now have logged actuals and computed scores.
      </Para>
      <Para>
        Open the team check-ins view to review the scores and add
        structured feedback per goal.
      </Para>
    </BrandLayout>
  );
}

export default CheckInSubmittedEmail;
