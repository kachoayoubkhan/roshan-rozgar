import assert from "node:assert/strict";

export function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const columns = {
  workers: ["id", "display_name", "trade", "experience_years", "service_area", "visit_charge_pkr", "skills", "profile_version", "online_preference", "latitude", "longitude", "onboarding_method"],
  customers: ["id", "display_name", "service_area"],
  service_requests: ["id", "customer_id", "trade", "issue_description", "service_area", "urgency", "preferred_time", "preferred_date", "budget_pkr", "created_at", "selected_worker_id", "status"],
  marketplace_discovery: ["id", "display_name", "trade", "service_area", "experience_years", "visit_charge_pkr", "latitude", "longitude", "onboarding_method", "review_count", "average_rating", "bookable"],
  worker_availability: ["worker_id", "bookable"],
  worker_reputation: ["worker_id", "completed_jobs", "review_count", "average_rating"],
};

// Narrow PostgREST stand-in. Writes and constraints are executed by PostgreSQL.
export async function dataApi(req, res, url, { db, localServiceKey, problems }) {
  assert.equal(req.headers.authorization, `Bearer ${localServiceKey}`);
  const table = url.pathname.split("/").at(-1);
  if (url.pathname.startsWith("/rest/v1/rpc/")) return rpc(req, res, table, db, problems);
  const allowed = columns[table];
  assert(allowed);
  const fields = (list) => {
    assert(list.every((field) => allowed.includes(field)));
    return list.join(",");
  };
  const params = [];
  const param = (value) => {
    params.push(value);
    return "$" + params.length;
  };
  const where = () => {
    const clauses = Array.from(url.searchParams).filter(([, value]) => value.startsWith("eq."))
      .map(([field, value]) => `${fields([field])} = ${param(value.slice(3))}`);
    return clauses.length ? " where " + clauses.join(" and ") : "";
  };
  const selected = fields(url.searchParams.get("select")?.split(",") ?? ["id"])
    .replace(/\bpreferred_date\b/g, "preferred_date::text as preferred_date");
  let sql;
  if (req.method === "GET") {
    sql = `select ${selected} from public.${table}${where()}`;
    if (url.searchParams.get("order") === "created_at.desc") sql += " order by created_at desc";
    if (url.searchParams.get("limit") === "1") sql += " limit 1";
  } else {
    const input = JSON.parse((await readBody(req)).toString("utf8"));
    const entries = Object.entries(input);
    const tableColumns = fields(Object.keys(input));

    if (req.method === "POST") {
      sql = `insert into public.${table} (${tableColumns}) values (${entries.map(([, item]) => param(item)).join(",")})`;
      if (req.headers.prefer?.includes("resolution=ignore-duplicates")) sql += " on conflict (id) do nothing";
    } else {
      assert.equal(req.method, "PATCH");
      sql = `update public.${table} set ${entries.map(([key, item]) => `${key} = ${param(item)}`).join(",")}${where()} returning ${selected}`;
    }
  }
  try {
    const result = await db.query(sql, params);
    if (req.method === "POST") { res.writeHead(201); res.end(); }
    else send(res, 200, result.rows);
  } catch (error) {
    if (error.code !== "23505") problems.push(error);
    send(res, error.code === "23505" ? 409 : 500, { code: error.code, message: "Integration database error" });
  }
}
const rpcParameters = {
  marketplace_job: ["p_actor", "p_request"],
  marketplace_jobs: ["p_actor", "p_role"],
  marketplace_action: ["p_actor", "p_action", "p_request", "p_worker", "p_quote", "p_amount", "p_message", "p_time", "p_online"],
};

async function rpc(req, res, name, db, problems) {
  assert(Object.hasOwn(rpcParameters, name));
  const allowed = rpcParameters[name];
  const body = JSON.parse((await readBody(req)).toString("utf8"));
  const keys = Object.keys(body);
  assert(keys.every((key) => allowed.includes(key)));
  const args = keys.map((key, index) => `${key} => $${index + 1}`).join(",");
  const statement = name === "marketplace_jobs"
    ? `select * from public.${name}(${args})`
    : `select public.${name}(${args}) as value`;
  try {
    const { rows } = await db.query(statement, keys.map((key) => body[key]));
    send(res, 200, name === "marketplace_jobs" ? rows : rows[0].value);
  } catch (error) {
    if (!/^PT\d{3}$/.test(error.code)) problems.push(error);
    send(res, /^PT\d{3}$/.test(error.code) ? Number(error.code.slice(2)) : 500,
      { code: error.code, message: error.message });
  }
}
