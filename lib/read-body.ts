/**
 * Size-capped request body readers for the public form routes. The cap is
 * enforced on the bytes actually read, not on the Content-Length header, so
 * a chunked request without one can't make the route buffer an unbounded
 * body. Reading stops the moment the cap is passed.
 */

export type BodyResult<T> =
  { ok: true; value: T } | { ok: false; reason: "too-large" | "invalid" };

async function readCapped(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  // Cheap early exit when the client is honest about the size.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** A JSON object body of at most `maxBytes`. Arrays and primitives are invalid. */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<BodyResult<Record<string, unknown>>> {
  const bytes = await readCapped(request, maxBytes).catch(() => undefined);
  if (bytes === null) return { ok: false, reason: "too-large" };
  if (bytes === undefined) return { ok: false, reason: "invalid" };
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { ok: false, reason: "invalid" };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** A multipart or urlencoded form body of at most `maxBytes`. */
export async function readFormBody(
  request: Request,
  maxBytes: number,
): Promise<BodyResult<FormData>> {
  const bytes = await readCapped(request, maxBytes).catch(() => undefined);
  if (bytes === null) return { ok: false, reason: "too-large" };
  if (bytes === undefined) return { ok: false, reason: "invalid" };
  try {
    // Re-wrap the bytes so the platform's parser handles the boundary.
    const form = await new Response(bytes, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    return { ok: true, value: form };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}
