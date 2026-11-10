import { z } from "zod";
import { failure, IntakeError, readJson } from "@/lib/intake/http";
import { aiFailure, openAI } from "@/lib/intake/openai";
import { ensureSession, requireSameOrigin, throttle } from "@/lib/intake/session";

export const runtime = "nodejs";

const speechInput = z.strictObject({ text: z.string().trim().min(1).max(2500), language: z.enum(["ur", "en"]).default("ur") });

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const session = await ensureSession(request);
    const input = speechInput.safeParse(await readJson(request));
    if (!input.success) throw new IntakeError(400, "This message could not be read aloud.");
    throttle(request, "speak", session, 15);
    const speech = await openAI().audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: input.data.text,
      instructions: input.data.language === "en"
        ? "Read the supplied text slowly and clearly in English. Preserve names and sector codes."
        : "Read the supplied text slowly and clearly in natural Pakistani Urdu. Use Urdu pronunciation for Roman Urdu text. Keep names and sector codes faithful to the text.",
      response_format: "mp3",
    }, { signal: request.signal });
    return new Response(speech.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (error) { return failure(aiFailure(error)); }
}
