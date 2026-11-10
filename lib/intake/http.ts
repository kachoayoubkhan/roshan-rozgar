import "server-only";

export class IntakeError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export function failure(error: unknown) {
  const known = error instanceof IntakeError;
  return Response.json(
    { error: known ? error.message : "Something went wrong. Please try again." },
    { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function boundedBody(request: Request, maxBytes: number) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) throw new IntakeError(413, "This input is too large. Try a shorter recording or message.");
  if (!request.body) throw new IntakeError(400, "Send a recording or some text.");
  const reader = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        void reader.cancel().catch(() => {});
        throw new IntakeError(413, "This input is too large. Try a shorter recording or message.");
      }
      chunks.push(value as Uint8Array<ArrayBuffer>);
    }
    return new Blob(chunks);
  } finally {
    reader.releaseLock();
  }
}

export async function readJson(request: Request, maxBytes = 12_000): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new IntakeError(415, "Send JSON for this action.");
  const body = await boundedBody(request, maxBytes);
  try { return JSON.parse(await body.text()); }
  catch { throw new IntakeError(400, "This input could not be read. Try again."); }
}
