import { asConnected, body, json } from "@/lib/internal/extension/http";
import { readFor } from "@/lib/internal/extension/ops";

export const dynamic = "force-dynamic";

/** Marks a notification read ({ id }), or all of them ({}). */
export async function POST(request: Request) {
  return asConnected(request, async (staff) => {
    const result = await readFor(staff, (await body(request)).id);
    return json(result, result.ok ? 200 : 400);
  });
}
