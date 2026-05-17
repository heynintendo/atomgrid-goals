import { BrandLayout, Highlight, Para } from "./_layout";

interface ManagerCommentEmailProps {
  employeeName: string;
  managerName:  string;
  period:       string;
  goalTitle:    string;
  comment:      string;
}

// Fires when a manager saves a comment on a specific (goal, period)
// check-in.  Employee sees the verbatim comment + goal context.
export function ManagerCommentEmail({
  employeeName,
  managerName,
  period,
  goalTitle,
  comment,
}: ManagerCommentEmailProps) {
  return (
    <BrandLayout
      preview={`${managerName} left feedback on your ${period} check-in.`}
      eyebrow={`${period} · CHECK-IN FEEDBACK`}
      heading={`Feedback on "${goalTitle}"`}
    >
      <Para>Hi {employeeName},</Para>
      <Para>
        <Highlight>{managerName}</Highlight> left feedback on your{" "}
        <Highlight>{period}</Highlight> check-in for{" "}
        <Highlight>&ldquo;{goalTitle}&rdquo;</Highlight>:
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
        }}
      >
        {comment}
      </div>
      <Para>
        Open the check-in to respond to the feedback or update your
        actuals if any data needs correcting.
      </Para>
    </BrandLayout>
  );
}

export default ManagerCommentEmail;
