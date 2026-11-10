import "server-only";
import type { PostgrestError } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { IntakeError } from "@/lib/intake/http";
import { readSession } from "@/lib/intake/session";
import { jobList, jobSchema, type JobAction, type JobRole } from "./schema";

export function marketplaceDb() {
  try { return createSupabaseServerClient(); }
  catch { throw new IntakeError(503, "The marketplace database is not configured."); }
}

function check(error: PostgrestError | null) {
  if (!error) return;
  if (/^PT(?:403|404|409|422)$/.test(error.code)) {
    throw new IntakeError(Number(error.code.slice(2)), error.message);
  }
  throw new IntakeError(503, "Marketplace data is temporarily unavailable. Try again.");
}

export async function loadJob(actor: string, id: string) {
  const { data, error } = await marketplaceDb().rpc("marketplace_job", { p_actor: actor, p_request: id });
  check(error);
  return data === null ? null : jobSchema.parse(data);
}

export async function listJobs(role: JobRole) {
  const actor = await readSession();
  if (!actor) return [];
  const { data, error } = await marketplaceDb().rpc("marketplace_jobs", { p_actor: actor, p_role: role });
  check(error);
  return jobList.parse(data);
}

export async function workerBookable() {
  const actor = await readSession();
  if (!actor) return false;
  const { data, error } = await marketplaceDb().from("worker_availability").select("bookable").eq("worker_id", actor).maybeSingle();
  check(error);
  return data?.bookable === true;
}

export async function applyJobAction(actor: string, action: JobAction) {
  const { data, error } = await marketplaceDb().rpc("marketplace_action", {
    p_actor: actor,
    p_action: action.action,
    ...("requestId" in action && { p_request: action.requestId }),
    ...("workerId" in action && { p_worker: action.workerId }),
    ...("quoteId" in action && { p_quote: action.quoteId }),
    ...("amount" in action && { p_amount: action.amount }),
    ...("rating" in action && { p_amount: action.rating }),
    ...("text" in action && { p_message: action.text }),
    ...("comment" in action && action.comment && { p_message: action.comment }),
    ...("time" in action && { p_time: action.time }),
    ...("online" in action && { p_online: action.online }),
  });
  check(error);
  return z.uuid().parse(data);
}
