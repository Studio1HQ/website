import { asConnected, body, json } from "@/lib/internal/extension/http";
import { moveTaskFor } from "@/lib/internal/extension/ops";

export const dynamic = "force-dynamic";

/** Moves one of your own tasks: { id, status }. */
export async function POST(request: Request) {
  return asConnected(request, async (staff) => {
    const input = await body(request);
    const result = await moveTaskFor(staff, input.id, input.status);
    return json(result, result.ok ? 200 : 400);
  });
}
