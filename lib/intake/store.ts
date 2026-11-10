import "server-only";
import { createHash } from "node:crypto";
import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../supabase/server";
import { areaCenters } from "../demo-workers";
import { customerRequestSchema, workerProfileSchema } from "../schemas";
import { IntakeError } from "./http";
import { readSession } from "./session";
import type { SaveIntake } from "./schema";

function db() {
  try { return createSupabaseServerClient(); }
  catch { throw new IntakeError(503, "Saving requires a configured Supabase project. Keep this tab open and try again after setup."); }
}

function check(error: PostgrestError | null) {
  if (error) throw new IntakeError(503, "Saved data is temporarily unavailable. Please try again.");
}

function scopedRequestId(session: string, draftId: string) {
  const hash = createHash("sha256").update(`${session}:request:${draftId}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export async function getWorker() {
  const id = await readSession();
  if (!id) return null;
  const { data, error } = await db().from("workers")
    .select("display_name,trade,experience_years,service_area,visit_charge_pkr,skills,profile_version,online_preference,onboarding_method")
    .eq("id", id).maybeSingle();
  check(error);
  if (!data) return null;
  const reputation = await db().from("worker_reputation")
    .select("review_count,average_rating,completed_jobs")
    .eq("worker_id", id).maybeSingle();
  check(reputation.error);
  return {
    profile: workerProfileSchema.parse({
      name: data.display_name, trade: data.trade, experienceYears: data.experience_years,
      serviceArea: data.service_area, visitChargePkr: data.visit_charge_pkr, skills: data.skills,
    }),
    version: Number(data.profile_version),
    online: data.online_preference === true,
    example: data.onboarding_method === "seed",
    reviewCount: Number(reputation.data?.review_count ?? 0),
    rating: reputation.data?.average_rating === null ? null : Number(reputation.data?.average_rating),
    completedJobs: Number(reputation.data?.completed_jobs ?? 0),
  };
}

export async function getRequest(requestId?: string) {
  const session = await readSession();
  if (!session) return null;
  const query = db().from("service_requests")
    .select("id,trade,issue_description,service_area,urgency,preferred_time,preferred_date,budget_pkr,selected_worker_id,status")
    .eq("customer_id", session);
  if (requestId) query.eq("id", requestId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
  check(error);
  if (!data) return null;
  return {
    id: String(data.id),
    selectedWorkerId: data.selected_worker_id as string | null,
    status: data.status as string,
    request: customerRequestSchema.parse({
      trade: data.trade, issueDescription: data.issue_description, serviceArea: data.service_area,
      urgency: data.urgency, preferredTime: data.preferred_time, preferredDate: data.preferred_date, budgetPkr: data.budget_pkr,
    }),
  };
}

export async function saveIntake(session: string, input: SaveIntake) {
  const client = db();
  if (input.kind === "worker") {
    const { name, trade, experienceYears, serviceArea, visitChargePkr, skills } = input.data;
    const [latitude, longitude] = areaCenters[serviceArea];
    const profile = {
      display_name: name, trade, experience_years: experienceYears, service_area: serviceArea,
      visit_charge_pkr: visitChargePkr, skills, latitude, longitude, onboarding_method: input.method,
    };
    if (input.expectedVersion === null) {
      const { error } = await client.from("workers").insert({ id: session, ...profile });
      if (error?.code === "23505") throw new IntakeError(409, "A profile is already saved here. Reload this page to review it before making changes.");
      check(error);
    } else {
      const { data, error } = await client.from("workers").update({ ...profile, profile_version: input.expectedVersion + 1 })
        .eq("id", session).eq("profile_version", input.expectedVersion).select("id").maybeSingle();
      check(error);
      if (!data) throw new IntakeError(409, "This profile has changed. Reload to review the latest version before saving.");
    }
    return { href: "/worker/home" };
  }

  const { trade, issueDescription, serviceArea, urgency, preferredTime, preferredDate, budgetPkr } = input.data;
  if (preferredDate && preferredTime) throw new IntakeError(422, "Choose a preferred date or an exact date and time.");
  const id = scopedRequestId(session, input.draftId);
  const customer = await client.from("customers").upsert(
    { id: session, display_name: "Demo customer", service_area: serviceArea },
    { onConflict: "id", ignoreDuplicates: true },
  );
  check(customer.error);
  const saved = await client.from("service_requests").upsert({
    id, customer_id: session, trade, issue_description: issueDescription, service_area: serviceArea,
    urgency, preferred_time: preferredTime, preferred_date: preferredDate, budget_pkr: budgetPkr,
  }, { onConflict: "id", ignoreDuplicates: true });
  check(saved.error);
  return { href: `/customer/workers?request=${id}` };
}
