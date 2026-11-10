import { failure, IntakeError, readJson } from "@/lib/intake/http";
import { saveIntakeSchema } from "@/lib/intake/schema";
import { ensureSession, readSession, requireSameOrigin, throttle } from "@/lib/intake/session";
import { saveIntake } from "@/lib/intake/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await readSession();
    if (!session) {
      // Establish ownership in the browser before a write, so a retried save uses the same identity.
      await ensureSession(request);
      return Response.json({ retry: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const input = saveIntakeSchema.safeParse(await readJson(request));
    if (!input.success) throw new IntakeError(422, "Check the required details before saving.");
    throttle(request, "save", session, 12);
    const result = await saveIntake(session, input.data);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
