import { asConnected, body, json } from "@/lib/internal/extension/http";
import { clockFor } from "@/lib/internal/extension/ops";

export const dynamic = "force-dynamic";

/** Start or end the day clock: { action: "start" | "stop" }. */
export async function POST(request: Request) {
  return asConnected(request, async (staff) => {
    const result = await clockFor(staff, (await body(request)).action);
    return json(result, result.ok ? 200 : 400);
  });
}
