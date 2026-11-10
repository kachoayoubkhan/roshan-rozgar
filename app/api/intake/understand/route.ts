import { z } from "zod";
import { boundedBody, failure, IntakeError, readJson } from "@/lib/intake/http";
import { aiFailure, checkedAudio, extract, openAI, transcribe } from "@/lib/intake/openai";
import { intakeDraft, intentSchema, maxAudioBytes, textInput, voiceConfirmed } from "@/lib/intake/schema";
import { ensureSession, requireSameOrigin, throttle } from "@/lib/intake/session";

export const runtime = "nodejs";
export const maxDuration = 55;

const textRequest = z.strictObject({ draft: intakeDraft, text: textInput });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await ensureSession(request);
    const multipart = request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;");
    let previous: z.infer<typeof intakeDraft>;
    let spoken: File | undefined;
    let text = "";
    let intent: z.infer<typeof intentSchema> = "extract";
    if (multipart) {
      const body = await boundedBody(request, maxAudioBytes + 32_000);
      const form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData().catch(() => { throw new IntakeError(400, "This recording could not be read."); });
      const file = form.get("audio");
      if (!(file instanceof File)) throw new IntakeError(400, "Send a microphone recording.");
      if (file.size > maxAudioBytes) throw new IntakeError(413, "This recording is too large. Try a shorter recording.");
      const raw = form.get("draft");
      if (typeof raw !== "string" || raw.length > 10_000) throw new IntakeError(400, "The draft could not be read.");
      let decoded: unknown;
      try { decoded = JSON.parse(raw); } catch { throw new IntakeError(400, "The draft could not be read."); }
      const draft = intakeDraft.safeParse(decoded);
      const mode = intentSchema.safeParse(form.get("intent"));
      if (!draft.success || !mode.success) throw new IntakeError(400, "The draft could not be read.");
      previous = draft.data;
      intent = mode.data;
      spoken = await checkedAudio(file);
    } else {
      const input = textRequest.safeParse(await readJson(request));
      if (!input.success) throw new IntakeError(400, "Enter a short description and try again.");
      previous = input.data.draft;
      text = input.data.text;
    }

    throttle(request, "understand", session, 12);
    const client = openAI();
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
    if (spoken) text = await transcribe(client, spoken, signal);
    const body = intent === "confirm"
      ? { mode: "confirm", confirmed: voiceConfirmed(previous.kind, text) }
      : { mode: "extract", draft: await extract(client, previous, text, signal), transcript: text };
    return Response.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(aiFailure(error)); }
}
