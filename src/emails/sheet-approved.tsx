import { BrandLayout, Highlight, Para } from "./_layout";

interface SheetApprovedEmailProps {
  employeeName: string;
  managerName:  string;
  cycleName:    string;
}

// Fires when the manager (or admin via force-approve) flips a sheet to
// APPROVED.  Employee learns that quarterly check-ins are now unlocked.
export function SheetApprovedEmail({
  employeeName,
  managerName,
  cycleName,
}: SheetApprovedEmailProps) {
  return (
    <BrandLayout
      preview={`${managerName} approved your ${cycleName} goal sheet.`}
      eyebrow={`${cycleName} · GOAL SHEET APPROVED`}
      heading="Your goal sheet is approved"
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        <Highlight>{managerName}</Highlight> approved your{" "}
        <Highlight>{cycleName}</Highlight> goal sheet. You can now log
        quarterly check-ins against each goal as windows open.
      </Para>
      <Para>
        The sheet itself is locked from further edits. If you need to
        revise a target or weightage post-approval, ask an admin to
        unlock it.
      </Para>
    </BrandLayout>
  );
}

export default SheetApprovedEmail;
