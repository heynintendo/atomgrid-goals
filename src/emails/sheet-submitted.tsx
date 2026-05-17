import { BrandLayout, Highlight, Para } from "./_layout";

interface SheetSubmittedEmailProps {
  employeeName: string;
  managerName:  string;
  cycleName:    string;
}

// Fires when an employee transitions their goal sheet from DRAFT
// (or RETURNED) to SUBMITTED.  Manager sees this in their inbox
// alongside the in-app /manager/approvals queue.
export function SheetSubmittedEmail({
  employeeName,
  managerName,
  cycleName,
}: SheetSubmittedEmailProps) {
  return (
    <BrandLayout
      preview={`${employeeName} submitted their ${cycleName} goal sheet for your review.`}
      eyebrow={`${cycleName} · GOAL SHEET SUBMITTED`}
      heading="A goal sheet is waiting for your review"
    >
      <Para>
        Hi {managerName},
      </Para>
      <Para>
        <Highlight>{employeeName}</Highlight> submitted their{" "}
        <Highlight>{cycleName}</Highlight> goal sheet for your review. Open
        the approval queue to inspect weightages, edit targets inline, and
        either approve the sheet or return it with feedback.
      </Para>
      <Para>
        Once approved, {employeeName.split(" ")[0]} unlocks quarterly
        check-ins and can begin logging progress against the sheet.
      </Para>
    </BrandLayout>
  );
}

export default SheetSubmittedEmail;
