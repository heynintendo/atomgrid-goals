import { BrandLayout, Highlight, Para } from "./_layout";

interface SheetUnlockedEmailProps {
  audience:     "employee" | "manager";
  employeeName: string;
  managerName:  string | null; // optional — recipient name in the manager variant
  adminName:    string;
  cycleName:    string;
  reason:       string;
}

const QUOTE_STYLE = {
  backgroundColor: "#F5F3EE",
  borderLeft:      "2px solid #FCB40C",
  padding:         "12px 16px",
  margin:          "16px 0",
  fontSize:        14,
  lineHeight:      "22px",
  color:           "#1A1A1A",
  fontStyle:       "italic",
};

// Fires when an admin uses /admin/unlock to flip a LOCKED sheet back to
// editable.  Both the employee (action implied: revise + resubmit) and
// their manager (heads-up: expect a fresh approval cycle) receive it.
export function SheetUnlockedEmail({
  audience,
  employeeName,
  managerName,
  adminName,
  cycleName,
  reason,
}: SheetUnlockedEmailProps) {
  if (audience === "employee") {
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
        <div style={QUOTE_STYLE}>{reason}</div>
        <Para>
          Every post-lock change is captured in the audit trail with a
          before/after diff. If you didn&rsquo;t expect this, reply to
          the admin directly to confirm.
        </Para>
      </BrandLayout>
    );
  }

  // Manager variant — informs the manager that their report's sheet
  // moved back into editable state and they should expect a revised
  // submission.
  return (
    <BrandLayout
      preview={`${employeeName}'s ${cycleName} goal sheet was unlocked by admin.`}
      eyebrow={`${cycleName} · TEAM SHEET UNLOCKED`}
      heading="A report's goal sheet has been unlocked"
    >
      <Para>Hi {managerName ?? "there"},</Para>
      <Para>
        Admin <Highlight>{adminName}</Highlight> unlocked{" "}
        <Highlight>{employeeName}</Highlight>&rsquo;s{" "}
        <Highlight>{cycleName}</Highlight> goal sheet for a post-approval
        edit. The reason recorded in the audit log:
      </Para>
      <div style={QUOTE_STYLE}>{reason}</div>
      <Para>
        Expect a revised submission to land back in your approvals
        queue. The full before/after diff is on the admin audit log
        page if you need the specifics.
      </Para>
    </BrandLayout>
  );
}

export default SheetUnlockedEmail;
