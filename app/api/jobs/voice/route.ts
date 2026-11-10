import { z } from "zod";
import { boundedBody, failure, IntakeError } from "@/lib/intake/http";
import { aiFailure, checkedAudio, openAI, transcribe } from "@/lib/intake/openai";
import { maxAudioBytes } from "@/lib/intake/schema";
import { readSession, requireSameOrigin, throttle } from "@/lib/intake/session";
import { loadJob } from "@/lib/jobs/store";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await readSession();
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get("request"));
    if (!actor || !id.success) throw new IntakeError(404, "This job is unavailable in this browser session.");
    throttle(request, "marketplace-voice", actor, 12);
    const job = await loadJob(actor, id.data);
    if (!job) throw new IntakeError(404, "This job is unavailable in this browser session.");
    if (job.status === "declined" || job.status === "cancelled" || job.booking?.status === "completed" || job.booking?.status === "cancelled") {
      throw new IntakeError(409, "This conversation is closed.");
    }
    const audio = await boundedBody(request, maxAudioBytes);
    const type = request.headers.get("content-type") ?? "";
    const file = await checkedAudio(new File([audio], "recording", { type }));
    const text = await transcribe(openAI(), file, request.signal);
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(aiFailure(error)); }
}
