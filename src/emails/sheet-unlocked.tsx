import { BrandLayout, Highlight, Para } from "./_layout";

interface SheetUnlockedEmailProps {
  employeeName: string;
  adminName:    string;
  cycleName:    string;
  reason:       string;
}

// Fires when an admin uses /admin/unlock to flip a LOCKED sheet back
// to APPROVED-with-edits.  Employee learns who acted and the reason,
// which mirrors the audit log row that just landed.
export function SheetUnlockedEmail({
  employeeName,
  adminName,
  cycleName,
  reason,
}: SheetUnlockedEmailProps) {
  return (
    <BrandLayout
      preview={`${adminName} unlocked your ${cycleName} goal sheet for edits.`}
      eyebrow={`${cycleName} · GOAL SHEET UNLOCKED`}
      heading="Your goal sheet has been unlocked for edits"
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        <Highlight>{adminName}</Highlight> unlocked your{" "}
        <Highlight>{cycleName}</Highlight> goal sheet so a post-approval
        edit could be made. The reason recorded in the audit log:
      </Para>
      <div
        style={{
          backgroundColor: "#F5F3EE",
          borderLeft:      "2px solid #0F5132",
          padding:         "12px 16px",
          margin:          "16px 0",
          fontSize:        14,
          lineHeight:      "22px",
          color:           "#1A1A1A",
          fontStyle:       "italic",
        }}
      >
        {reason}
      </div>
      <Para>
        Every post-lock change is captured in the audit trail with a
        before/after diff. If you didn&rsquo;t expect this, reply to
        the admin directly to confirm.
      </Para>
    </BrandLayout>
  );
}

export default SheetUnlockedEmail;
