import { asConnected, body, json } from "@/lib/internal/extension/http";
import { addTaskFor, moveTaskFor } from "@/lib/internal/extension/ops";

export const dynamic = "force-dynamic";

/** { id, status } moves one of your own tasks; { title, day } adds one to your list. */
export async function POST(request: Request) {
  return asConnected(request, async (staff) => {
    const input = await body(request);
    const result = input.id === undefined ? await addTaskFor(staff, input.title, input.day) : await moveTaskFor(staff, input.id, input.status);
    return json(result, result.ok ? 200 : 400);
  });
}
