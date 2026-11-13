import { firstName } from "@/lib/first-name";
import { renderEmail } from "@/lib/internal/email-templates";
import { formatMoney, monthLabel } from "@/lib/internal/team/shared";

/**
 * The email a payslip goes out with: short, with the PDF attached. Uses the
 * paper layout without a header image ("01 — Payroll").
 */
export function payslipEmail({ name, month, net }: { name: string; month: string; net: number }) {
  const label = monthLabel(month);
  const body = [
    `Hi ${firstName(name)},`,
    `Your payslip for ${label} is attached. Net pay: ${formatMoney(net, "INR")}.`,
    "Reply to this email if anything looks off, and we'll sort it out.",
    "Thanks for all your work this month.\nStudio1",
  ].join("\n\n");
  const { html, text } = renderEmail({
    body,
    reason: "You're getting this because you're on the Studio1 team. Keep the attached PDF for your records.",
    section: "Payroll",
    program: label,
    hideBanner: true,
  });
  return { subject: `Your payslip for ${label}`, html, text };
}
