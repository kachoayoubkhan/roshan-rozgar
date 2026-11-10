import { z } from "zod";
import { failure, IntakeError, readJson } from "@/lib/intake/http";
import { readSession, requireSameOrigin, throttle } from "@/lib/intake/session";
import { jobAction } from "@/lib/jobs/schema";
import { applyJobAction, loadJob } from "@/lib/jobs/store";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const id = z.uuid().safeParse(new URL(request.url).searchParams.get("request"));
    const actor = await readSession();
    if (!id.success || !actor) throw new IntakeError(404, "This job is unavailable in this browser session.");
    const job = await loadJob(actor, id.data);
    if (!job) throw new IntakeError(404, "This job is unavailable in this browser session.");
    return Response.json(job, { headers });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await readSession();
    if (!actor) throw new IntakeError(403, "Open the app in your original browser session.");
    const action = jobAction.safeParse(await readJson(request, 24_000));
    if (!action.success) throw new IntakeError(422, "Check the message, price or date before submitting.");
    throttle(request, "marketplace", actor, 40);
    const id = await applyJobAction(actor, action.data);
    return Response.json({ id }, { headers });
  } catch (error) { return failure(error); }
}
