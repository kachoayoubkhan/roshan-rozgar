import { english, newEnglishContext } from "./language-context.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import EmbeddedPostgres from "embedded-postgres";
import { chromium } from "playwright";
import { dataApi, readBody, send } from "./data-api.mjs";

const localServiceKey = "phase03-local-service-role";
const localOpenAIKey = "phase03-local-openai";
const problems = [];
async function freePort() {
  const server = createNetServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

const postgres = new EmbeddedPostgres({
  databaseDir: await mkdtemp(join(tmpdir(), "roshan-phase03-")),
  port: Number(process.env.PHASE03_PG_PORT ?? await freePort()),
  user: "postgres", password: crypto.randomUUID(), persistent: false,
  initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-h", "127.0.0.1"], onLog: () => {},
});
let admin;
let db;
let started = false;
let next;
let browser;
const clients = [];
let recordedMessages = 0;
const stub = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const respond = async () => {
    if (url.pathname.startsWith("/rest/")) return dataApi(req, res, url, { db, localServiceKey, problems });
    assert.equal(url.pathname, "/v1/audio/transcriptions");
    assert.equal(req.headers.authorization, "Bearer " + localOpenAIKey);
    const payload = await readBody(req);
    assert(payload.includes(Buffer.from("gpt-4o-mini-transcribe")));
    assert(payload.includes(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])));
    recordedMessages++;
    send(res, 200, { text: "Main kal aa sakta hoon.", logprobs: [{ logprob: -0.1 }] });
  };
  void respond().catch((error) => {
    problems.push(error);
    send(res, 500, { error: "Unexpected integration request" });
  });
});

async function serviceClient() {
  const client = postgres.getPgClient();
  await client.connect();
  clients.push(client);
  await client.query("set role service_role");
  return client;
}

function sqlAction(client, actor, action, requestId, options = {}) {
  return client.query("select public.marketplace_action($1,$2,$3,$4,$5,$6,$7,$8,$9) as id",
    [actor, action, requestId, options.worker ?? null, options.quote ?? null, options.amount ?? null,
      options.text ?? null, options.time ?? null, options.online ?? null]).then(({ rows }) => rows[0].id);
}

try {
  await postgres.initialise();
  await postgres.start();
  started = true;
  admin = postgres.getPgClient();
  await admin.connect();
  await admin.query("create role anon; create role authenticated; create role service_role bypassrls;");
  for (const filename of ["schema.sql", "seed.sql", "phase_02.sql", "phase_03.sql", "phase_04.sql"]) {
    await admin.query(await readFile(new URL(`../supabase/${filename}`, import.meta.url), "utf8"));
  }
  await admin.query("set role anon");
  await assert.rejects(() => admin.query("select public.marketplace_jobs(null, 'customer')"), { code: "42501" });
  await admin.query("reset role");
  db = await serviceClient();
  stub.listen(0, "127.0.0.1");
  await once(stub, "listening");
  const stubUrl = `http://127.0.0.1:${stub.address().port}`;
  const port = process.env.PHASE03_TEST_PORT ?? String(await freePort());
  const origin = `http://127.0.0.1:${port}`;
  next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
    stdio: "inherit",
    env: {
      ...process.env,
      OPENAI_API_KEY: localOpenAIKey,
      OPENAI_BASE_URL: stubUrl + "/v1",
      DEMO_SESSION_SECRET: "phase03-local-secret-used-only-in-this-test",
      NEXT_PUBLIC_SUPABASE_URL: stubUrl,
      SUPABASE_SERVICE_ROLE_KEY: localServiceKey,
    },
  });
  let ready = false;
  for (let attempt = 0; attempt < 50 && next.exitCode === null; attempt++) {
    if (await fetch(origin).then((response) => response.ok).catch(() => false)) { ready = true; break; }
    await wait(200);
  }
  assert(ready && next.exitCode === null, "Production server did not start");

  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: ["--use-fake-device-for-media-stream"] });
  const worker = await newEnglishContext(browser, { viewport: { width: 390, height: 844 }, permissions: ["microphone"] });
  const customer = await newEnglishContext(browser, { viewport: { width: 1280, height: 800 } });
  const other = await newEnglishContext(browser);
  const wp = await worker.newPage();
  const cp = await customer.newPage();
  const browserErrors = [];
  wp.on("pageerror", (error) => browserErrors.push(error.message));
  cp.on("pageerror", (error) => browserErrors.push(error.message));
  const post = (context, path, data) => context.request.post(origin + path, { headers: { origin }, data });
  const act = (context, action, requestId, extra = {}) => post(context, "/api/jobs", { action, requestId, ...extra });
  const read = async (context, requestId) => {
    const response = await context.request.get(origin + "/api/jobs?request=" + requestId);
    assert.equal(response.status(), 200);
    return response.json();
  };
  const button = (page, name) => page.getByRole("button", { name: english(name), exact: true });
  const text = (page, value) => page.getByText(english(value), { exact: true });
  async function save(context, payload) {
    const response = await post(context, "/api/intake/save", payload);
    assert.equal(response.status(), 200, await response.text());
    const result = await response.json();
    if ("retry" in result) {
      const retried = await post(context, "/api/intake/save", payload);
      assert.equal(retried.status(), 200, await retried.text());
      return retried.json();
    }
    return result;
  }
  const profile = { name: english("Nadia Phase Three"), trade: "plumber", serviceArea: "G-11", experienceYears: 7, visitChargePkr: 1500, skills: [] };
  await save(worker, { kind: "worker", data: profile, method: "assisted", expectedVersion: null });
  const workerId = (await db.query("select id from public.workers where display_name = $1", [profile.name])).rows[0].id;
  async function requestJob(context, problem) {
    const result = await save(context, { kind: "request", draftId: crypto.randomUUID(), data: {
      trade: "plumber", issueDescription: problem, serviceArea: "G-11", urgency: "today",
      preferredDate: null, preferredTime: null, budgetPkr: null,
    } });
    return { href: origin + result.href, id: new URL(result.href, origin).searchParams.get("request") };
  }

  await wp.goto(origin + "/worker/home");
  await button(wp, "Go online").click();
  await text(wp, "Available for work").waitFor();

  const first = await requestJob(customer, "Kitchen tap leaks");
  await cp.goto(first.href);
  const workerCard = cp.getByRole("heading", { name: profile.name }).locator("xpath=../..").locator("xpath=..");
  await workerCard.getByRole("button", { name: english("Request this worker") }).click();
  await cp.getByRole("heading", { name: english("Messages") }).waitFor();
  await cp.getByLabel(english("Message"), { exact: true }).fill("The kitchen tap is leaking every morning.");
  await button(cp, "Send message").click();
  await text(cp, "The kitchen tap is leaking every morning.").waitFor();

  await wp.getByRole("link", { name: english("Kitchen tap leaks") }).click();
  await text(wp, "The kitchen tap is leaking every morning.").waitFor();
  await wp.reload();
  await text(wp, "The kitchen tap is leaking every morning.").waitFor();
  await button(wp, "Record message").click();
  await button(wp, "Stop recording").waitFor();
  // Give Chrome's fake microphone enough time to leave its initial silent interval.
  await wait(1500);
  await button(wp, "Stop recording").click();
  await wp.waitForFunction(() => document.querySelector("textarea")?.value === "Main kal aa sakta hoon.").catch(async (error) => {
    console.log("Recording check alerts:", await wp.locator("main [role=alert]").allTextContents());
    throw error;
  });
  assert.equal((await read(customer, first.id)).messages.length, 1);
  await button(wp, "Send message").click();
  await text(cp, "Main kal aa sakta hoon.").waitFor();
  assert.equal(recordedMessages, 1);
  console.log("Persistent messages, worker polling, editable voice transcript and refresh passed.");

  assert.equal((await act(worker, "quote", first.id, { quoteId: null, amount: -5 })).status(), 422);
  assert.equal((await act(customer, "quote", first.id, { quoteId: null, amount: 2200 })).status(), 403);
  await wp.getByLabel(english("Quote amount in PKR")).fill("2300");
  await button(wp, "Send quote").click();
  await text(cp, "Rs. 2,300").waitFor();
  const firstQuote = (await read(customer, first.id)).quote.id;
  await wp.getByLabel(english("Quote amount in PKR")).fill("2500");
  await button(wp, "Send revised quote").click();
  await text(cp, "Rs. 2,500").waitFor();
  assert.equal((await act(customer, "accept", first.id, { quoteId: firstQuote })).status(), 409);
  await button(cp, "Request a revised price").click();
  await text(wp, "Please send a revised quote. / Nayi qeemat batayein.").waitFor();
  await wp.getByLabel(english("Quote amount in PKR")).fill("2600");
  await button(wp, "Send quote").click();
  await text(cp, "Rs. 2,600").waitFor();
  await button(cp, "Accept price").click();
  await text(wp, "Agreed price").waitFor();
  const agreed = (await read(customer, first.id)).quote;
  assert.equal(agreed.amount, 2600);

  const time = new Date(Date.now() + 86_400_000).toISOString();
  const localTime = new Date(Date.parse(time) + 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
  await cp.getByLabel(english("Booking date and time (PKT)")).fill(localTime);
  await button(cp, "Confirm booking").click();
  await cp.getByRole("heading", { name: english("Booking details") }).waitFor();
  await wp.getByRole("heading", { name: english("Booking details") }).waitFor();
  const booked = (await read(customer, first.id)).booking;
  assert.deepEqual((await read(worker, first.id)).booking, booked);
  assert.equal(booked.amount, 2600);
  assert.equal(booked.status, "confirmed");
  assert.equal((await act(customer, "confirm", first.id, { quoteId: agreed.id, time })).status(), 409);
  assert.equal((await act(customer, "complete", first.id)).status(), 403);
  assert.equal((await act(worker, "complete", first.id)).status(), 409);
  assert.equal((await act(customer, "review", first.id, { rating: 5 })).status(), 409);
  await cp.reload();
  await text(cp, booked.id).waitFor();
  await cp.goto(origin + "/customer/bookings");
  await cp.getByRole("heading", { name: english("Booking history") }).waitFor();
  await cp.getByRole("link", { name: english("Kitchen tap leaks") }).click();
  await text(cp, booked.id).waitFor();

  const second = await requestJob(other, "Pipe below sink leaks");
  const op = await other.newPage();
  await op.goto(second.href);
  assert.equal(await op.getByRole("heading", { name: profile.name }).count(), 0);
  assert.equal((await act(other, "select", second.id, { workerId })).status(), 409);
  assert.equal((await other.request.get(origin + "/api/jobs?request=" + first.id)).status(), 404);
  assert.equal((await act(other, "message", first.id, { text: "Not my job" })).status(), 404);
  assert.equal((await other.request.post(origin + "/api/jobs/voice?request=" + first.id, { headers: { origin }, data: "" })).status(), 404);
  await wp.goto(origin + "/worker/home");
  await text(wp, "Busy with a booking").waitFor();
  await wp.getByRole("link", { name: english("Kitchen tap leaks") }).click();
  await button(wp, "Start job").click();
  await text(cp, "In progress").first().waitFor();
  await button(wp, "Mark completed").click();
  await text(cp, "Completed").first().waitFor();
  assert.equal((await act(worker, "review", first.id, { rating: 4, comment: "Good work" })).status(), 403);
  assert.equal((await act(worker, "review", first.id, { rating: 0 })).status(), 422);
  await button(cp, "Submit review").click();
  await text(cp, "Your review").waitFor();
  await text(cp, "5 / 5").waitFor();
  await cp.reload();
  await text(cp, "Your review").waitFor();
  await text(cp, "5 / 5").waitFor();
  assert.equal((await act(customer, "review", first.id, { rating: 5 })).status(), 409);
  const reputation = (await db.query(
    "select review_count, average_rating from public.worker_reputation where worker_id = $1",
    [workerId],
  )).rows[0];
  assert.equal(Number(reputation.review_count), 1);
  assert.equal(Number(reputation.average_rating), 5);
  console.log("Post-job review, duplicate guard and reputation update passed.");

  await wp.goto(origin + "/worker/home");
  await text(wp, "Available for work").waitFor();
  await op.reload();
  await op.getByRole("heading", { name: profile.name }).waitFor();
  await op.getByText(english("5.0 (1 reviews)"), { exact: false }).waitFor();
  console.log("Price revisions, booking, history, isolation, busy discovery and completion passed.");

  const third = await requestJob(customer, "Bathroom tap needs repair");
  assert.equal((await act(other, "select", second.id, { workerId })).status(), 200);
  assert.equal((await act(customer, "select", third.id, { workerId })).status(), 200);
  for (const [context, id] of [[other, second.id], [customer, third.id]]) {
    const quote = await act(worker, "quote", id, { quoteId: null, amount: 1900 });
    assert.equal(quote.status(), 200);
    assert.equal((await act(context, "accept", id, { quoteId: (await quote.json()).id })).status(), 200);
  }
  const secondJob = await read(other, second.id);
  const thirdJob = await read(customer, third.id);
  const owners = new Map((await db.query("select id, customer_id from public.service_requests where id in ($1,$2)", [second.id, third.id])).rows
    .map((row) => [row.id, row.customer_id]));
  const left = await serviceClient();
  const right = await serviceClient();
  const rightPid = (await right.query("select pg_backend_pid() as pid")).rows[0].pid;
  await left.query("begin");
  let competing;
  try {
    const reserved = await sqlAction(left, owners.get(second.id), "confirm", second.id, { quote: secondJob.quote.id, time });
    assert(reserved);
    competing = sqlAction(right, owners.get(third.id), "confirm", third.id, { quote: thirdJob.quote.id, time })
      .then((id) => ({ id }), (error) => ({ code: error.code }));
    let waiting = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const { rows } = await admin.query("select wait_event_type from pg_stat_activity where pid = $1", [rightPid]);
      if (rows[0]?.wait_event_type === "Lock") { waiting = true; break; }
      await wait(75);
    }
    assert(waiting, "Second PostgreSQL connection never waited on the worker lock");
    await left.query("commit");
  } catch (error) {
    await left.query("rollback");
    throw error;
  }
  assert.deepEqual(await competing, { code: "PT409" });
  assert.equal((await db.query("select count(*)::int as total from public.bookings where worker_id = $1 and status in ('confirmed','in_progress')", [workerId])).rows[0].total, 1);
  assert.equal((await read(customer, third.id)).status, "price_agreed");
  assert.equal((await act(worker, "availability", undefined, { online: false })).status(), 200);
  assert.equal((await act(worker, "start", second.id)).status(), 200);
  assert.equal((await act(worker, "complete", second.id)).status(), 200);
  const effective = (await db.query("select a.bookable,w.online_preference from public.worker_availability a join public.workers w on w.id=a.worker_id where w.id=$1", [workerId])).rows[0];
  assert.deepEqual(effective, { bookable: false, online_preference: false });
  assert.equal((await act(customer, "confirm", third.id, { quoteId: thirdJob.quote.id, time })).status(), 409);
  console.log("Concurrent confirmations used two PostgreSQL connections. The second waited for the worker lock and received PT409.");

  for (const width of [360, 390, 768, 1280]) {
    await wp.setViewportSize({ width, height: 844 });
    for (const route of ["/worker/home", "/worker/jobs/" + second.id]) {
      assert.equal((await wp.goto(origin + route)).status(), 200);
      assert(await wp.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + " overflows at " + width);
    }
  }
  assert.deepEqual(browserErrors, []);
  assert.deepEqual(problems, []);
  console.log("Phase 03 passed, including responsive layouts and persistent booking data. OpenAI transcription was stubbed.");
} finally {
  await browser?.close();
  if (next?.exitCode === null) next.kill();
  stub.close();
  await Promise.all(clients.map((client) => client.end()));
  await admin?.end();
  if (started) await postgres.stop();
}
