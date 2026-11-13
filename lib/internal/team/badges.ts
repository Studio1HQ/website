import { selectRows } from "@/lib/supabase-server";

/**
 * The sidebar's counts for admins: expense claims waiting for a decision and
 * payments still to make. Zero when the team migration hasn't run.
 */
export async function teamBadges(): Promise<{ payroll: number; payments: number }> {
  const count = async (table: string, filters: Record<string, string>) => {
    const result = await selectRows(table, new URLSearchParams({ select: "id", limit: "1", ...filters }), { count: true });
    return result.ok ? (result.total ?? 0) : 0;
  };
  const [payroll, payments] = await Promise.all([
    count("team_reimbursements", { status: "eq.submitted" }),
    count("payments", { status: "eq.due", direction: "eq.out" }),
  ]);
  return { payroll, payments };
}
