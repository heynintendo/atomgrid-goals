import { BrandLayout, Highlight, Para } from "./_layout";

interface SheetReturnedEmailProps {
  employeeName: string;
  managerName:  string;
  cycleName:    string;
  reason:       string;
}

// Fires when the manager returns a sheet for rework with a reason.
// Employee gets the verbatim reason text so they can act without a
// round-trip in chat.
export function SheetReturnedEmail({
  employeeName,
  managerName,
  cycleName,
  reason,
}: SheetReturnedEmailProps) {
  return (
    <BrandLayout
      preview={`${managerName} returned your ${cycleName} goal sheet with feedback.`}
      eyebrow={`${cycleName} · GOAL SHEET RETURNED`}
      heading="Your goal sheet has been returned for rework"
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        <Highlight>{managerName}</Highlight> returned your{" "}
        <Highlight>{cycleName}</Highlight> goal sheet with the following
        feedback. Review the notes, revise the affected goals, and
        resubmit when ready.
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
        The sheet is back in editable state — your edits won&rsquo;t be
        treated as a rewrite of an already-approved sheet.
      </Para>
    </BrandLayout>
  );
}

export default SheetReturnedEmail;
