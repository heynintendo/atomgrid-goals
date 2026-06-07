import { BrandLayout, Highlight, Para } from "./_layout";

interface ManagerCommentEmailProps {
  audience:      "employee" | "manager";
  commenterRole: "MANAGER" | "ADMIN";
  commenterName: string;
  employeeName:  string;
  managerName:   string | null; // recipient name when audience === "manager"
  period:        string;
  goalTitle:     string;
  comment:       string;
}

const QUOTE_STYLE = {
  backgroundColor: "#F5F3EE",
  borderLeft:      "2px solid #FCB40C",
  padding:         "12px 16px",
  margin:          "16px 0",
  fontSize:        14,
  lineHeight:      "22px",
  color:           "#1A1A1A",
};

// Fires when feedback is saved on a (goal, period) check-in.  Three
// valid send patterns:
//   - manager comments → employee only (audience=employee, role=MANAGER)
//   - admin comments   → employee directly (audience=employee, role=ADMIN)
//   - admin comments   → employee's manager (audience=manager, role=ADMIN)
// The manager-comment-on-own-report path stays single-audience to keep
// noise low; admin-comment fans out for transparency.
export function ManagerCommentEmail({
  audience,
  commenterRole,
  commenterName,
  employeeName,
  managerName,
  period,
  goalTitle,
  comment,
}: ManagerCommentEmailProps) {
  const commenterPrefix = commenterRole === "ADMIN" ? "Admin " : "";

  if (audience === "employee") {
    return (
      <BrandLayout
        preview={`${commenterPrefix}${commenterName} left feedback on your ${period} check-in.`}
        eyebrow={`${period} · CHECK-IN FEEDBACK`}
        heading={`Feedback on "${goalTitle}"`}
      >
        <Para>Hi {employeeName},</Para>
        <Para>
          {commenterRole === "ADMIN" ? "Admin " : null}
          <Highlight>{commenterName}</Highlight> left feedback on your{" "}
          <Highlight>{period}</Highlight> check-in for{" "}
          <Highlight>&ldquo;{goalTitle}&rdquo;</Highlight>:
        </Para>
        <div style={QUOTE_STYLE}>{comment}</div>
        <Para>
          Open the check-in to respond to the feedback or update your
          actuals if any data needs correcting.
        </Para>
      </BrandLayout>
    );
  }

  // Manager variant — surfaces admin-left feedback on one of their
  // reports.  The manager isn't expected to act; this is transparency
  // so they aren't blindsided by a downstream conversation.
  return (
    <BrandLayout
      preview={`Admin feedback on ${employeeName}'s ${period} check-in.`}
      eyebrow={`${period} · TEAM CHECK-IN FEEDBACK`}
      heading={`Admin feedback on "${goalTitle}"`}
    >
      <Para>Hi {managerName ?? "there"},</Para>
      <Para>
        Admin <Highlight>{commenterName}</Highlight> left feedback on{" "}
        <Highlight>{employeeName}</Highlight>&rsquo;s{" "}
        <Highlight>{period}</Highlight> check-in for{" "}
        <Highlight>&ldquo;{goalTitle}&rdquo;</Highlight> — surfaced
        here for transparency:
      </Para>
      <div style={QUOTE_STYLE}>{comment}</div>
      <Para>
        No action needed from you; the employee has been notified
        directly. Open the team check-ins view if you want to follow
        up alongside.
      </Para>
    </BrandLayout>
  );
}

export default ManagerCommentEmail;
