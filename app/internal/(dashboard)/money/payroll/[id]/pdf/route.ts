import { NextResponse, type NextRequest } from "next/server";
import { emailAddress } from "@/lib/internal/token";
import { isAdmin, requireMember } from "@/lib/internal/session";
import { draftPayslip, getPayslip } from "@/lib/internal/team/payroll";
import { payslipFileName, payslipPdf } from "@/lib/internal/team/payslip-pdf";
import { isMonthKey, type Payslip } from "@/lib/internal/team/shared";

type Props = { params: Promise<{ id: string }> };

const notFound = () => new NextResponse("Not found", { status: 404, headers: { "cache-control": "no-store" } });

/**
 * A payslip as a PDF, made on the fly (nothing is stored):
 *   /internal/money/payroll/<id>/pdf                         a saved slip: admins, or
 *                                                      its own employee once sent
 *   /internal/money/payroll/draft/pdf?email=…&month=YYYY-MM  an unsaved draft: admins
 */
export async function GET(request: NextRequest, { params }: Props) {
  const staff = await requireMember();
  const { id } = await params;
  let slip: Payslip | null = null;

  if (id === "draft") {
    if (!isAdmin(staff)) return notFound();
    const email = emailAddress(request.nextUrl.searchParams.get("email"));
    const month = request.nextUrl.searchParams.get("month");
    if (email && isMonthKey(month)) slip = await draftPayslip(email, month);
  } else {
    slip = await getPayslip(id);
    if (slip && !isAdmin(staff) && !(slip.email === staff.email && slip.status === "sent")) slip = null;
  }
  if (!slip) return notFound();

  let bytes: Uint8Array;
  try {
    bytes = await payslipPdf({ ...slip, payDate: slip.sent_at });
  } catch (error) {
    console.error(`[payroll] making the PDF for ${slip.email} failed`, error);
    return new NextResponse("Couldn't make the PDF.", { status: 500, headers: { "cache-control": "no-store" } });
  }
  const name = payslipFileName(slip);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
