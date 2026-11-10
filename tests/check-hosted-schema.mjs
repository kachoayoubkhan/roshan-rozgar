import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index <= 0) continue;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (!process.env[key]) process.env[key] = value;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});


const tables = ["workers", "customers", "service_requests", "messages", "quotes", "bookings", "reviews"];
const checks = [
  ...tables.map((name) => ({
    name: "schema (" + name + " table)",
    run: () => sb.from(name).select("*").limit(0),
  })),
  { name: "schema (availability)", run: () => sb.from("worker_availability").select("worker_id,bookable").limit(0) },
  { name: "schema (reputation)", run: () => sb.from("worker_reputation").select("worker_id,review_count,average_rating").limit(0) },
  { name: "phase_02 worker columns", run: () => sb.from("workers").select("skills,profile_version,visit_charge_pkr").limit(0) },
  { name: "phase_02 request columns", run: () => sb.from("service_requests").select("preferred_date,budget_pkr").limit(0) },
  { name: "phase_03 worker selection", run: () => sb.from("service_requests").select("selected_worker_id").limit(0) },
  { name: "phase_03 discovery", run: () => sb.from("marketplace_discovery").select("id,bookable,review_count,average_rating").limit(0) },
  { name: "phase_03 jobs RPC", run: () => sb.rpc("marketplace_jobs", {
    p_actor: "00000000-0000-0000-0000-000000000000", p_role: "customer",
  }, { get: true }) },
  { name: "job details RPC", run: () => sb.rpc("marketplace_job", {
    p_actor: "00000000-0000-0000-0000-000000000000",
    p_request: "00000000-0000-0000-0000-000000000000",
  }, { get: true }) },
];
let missing = 0;
let failed = 0;
for (const check of checks) {
  const { error } = await check.run().abortSignal(AbortSignal.timeout(12000));
  if (!error) console.log("OK       " + check.name);
  else if (["PGRST205", "PGRST202", "42703"].includes(error.code)) {
    missing++;
    console.log("MISSING  " + check.name + " (" + error.code + ")");
  } else {
    failed++;
    console.log("ERROR    " + check.name + " (" + (error.code || "connection failed") + ")");
  }
}
console.log("Phase 04 replaces existing functions. Its review behavior requires the completed-job smoke test to verify.");
if (missing) console.log("Apply missing migrations in SQL Editor: schema.sql → phase_02.sql → phase_03.sql → phase_04.sql. Skip seed.sql for fresh demo profiles.");
if (failed) console.log("Resolve connectivity or permission errors before treating the schema as ready.");
process.exitCode = failed ? 1 : missing ? 2 : 0;
