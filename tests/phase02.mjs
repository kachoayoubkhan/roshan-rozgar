import { english, newEnglishContext } from "./language-context.mjs";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { setTimeout as wait } from "node:timers/promises";
import { PGlite } from "@electric-sql/pglite";
import { chromium } from "playwright";
import { dataApi, readBody, send } from "./data-api.mjs";

const db = new PGlite();
const workerDraft = { name: english("Nadia Ahmed"), trade: "plumber", experienceYears: null, serviceArea: "G-11", visitChargePkr: null, skills: ["Pipe fitting"] };
const requestDraft = { trade: "plumber", issueDescription: "Kitchen pipe is leaking", serviceArea: "G-11", urgency: "today", preferredTime: null, preferredDate: "2026-11-10", budgetPkr: null };
const workerOrigin = { kind: "worker", data: workerDraft };
let nextTranscript = "";
let rateLimited = false;
let speechRequests = 0;
let audioUploads = 0;
let extractionRequests = 0;
const problems = [];
const localServiceKey = "phase02-integration-service-role";
const localOpenAIKey = "phase02-integration-openai";

async function openAI(req, res, url) {
  assert.equal(req.headers.authorization, `Bearer ${localOpenAIKey}`);
  const body = await readBody(req);
  if (url.pathname.endsWith("/transcriptions")) {
    assert.match(req.headers["content-type"], /^multipart\/form-data; boundary=/);
    assert(body.includes(Buffer.from("gpt-4o-mini-transcribe")));
    assert(body.includes(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])));
    audioUploads++;
    return send(res, 200, { text: nextTranscript, logprobs: [{ logprob: -0.05 }] });
  }
  const payload = JSON.parse(body.toString("utf8"));
  if (url.pathname.endsWith("/speech")) {
    assert.equal(payload.model, "gpt-4o-mini-tts");
    assert.match(payload.instructions, /English/);
    speechRequests++;
    res.writeHead(200, { "Content-Type": "audio/mpeg" });
    res.end(Buffer.from("Integration audio stub"));
    return;
  }
  assert(url.pathname.endsWith("/responses"));
  assert.equal(payload.model, "gpt-4o-mini");
  assert.equal(payload.text.format.strict, true);
  assert.equal(payload.store, false);
  extractionRequests++;
  if (rateLimited) return send(res, 429, { error: { message: "Integration rate limit" } });
  const input = JSON.parse(payload.input[1].content);
  let data = requestDraft;
  if (input.kind === "worker") {
    data = /7|saat/i.test(input.transcript)
      ? { ...input.previous, experienceYears: 7 }
      : workerDraft;
  }
  send(res, 200, { object: "response", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(data) }] }] });
}

const stub = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const operation = url.pathname.startsWith("/rest/")
    ? () => dataApi(req, res, url, { db, localServiceKey, problems }) : () => openAI(req, res, url);
  void operation().catch((error) => {
    problems.push(error);
    if (!res.headersSent) send(res, 500, { error: "Unexpected integration request" });
    else res.end();
  });
});

let next;
let browser;
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  for (const filename of ["schema.sql", "seed.sql", "phase_02.sql", "phase_03.sql"]) {
    await db.exec(await readFile(new URL(`../supabase/${filename}`, import.meta.url), "utf8"));
  }
  await db.exec("set role service_role");
  stub.listen(0, "127.0.0.1");
  await once(stub, "listening");
  const stubUrl = `http://127.0.0.1:${stub.address().port}`;
  const port = process.env.PHASE02_TEST_PORT ?? "3102";
  const origin = `http://127.0.0.1:${port}`;
  next = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], {
    stdio: "inherit",
    env: {
      ...process.env,
      OPENAI_API_KEY: localOpenAIKey,
      OPENAI_BASE_URL: `${stubUrl}/v1`,
      DEMO_SESSION_SECRET: "local-integration-secret-with-more-than-32-bytes",
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

  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    args: ["--use-fake-device-for-media-stream"],
  });
  const context = await newEnglishContext(browser, { permissions: ["microphone"], viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", { value: () => [] });
  });
  const page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  const button = (name) => page.getByRole("button", { name: english(name), exact: true });
  const heading = (name) => page.getByRole("heading", { name: english(name), exact: true });
  const alert = () => page.locator("main [role=alert]").first();
  const request = (path, options) => context.request.post(origin + path, { headers: { origin }, ...options });
  async function record(start, stop, transcript) {
    nextTranscript = transcript;
    await button(start).click();
    await button(stop).waitFor();
    await wait(600);
    await button(stop).click();
  }

  const crossSite = await context.request.post(origin + "/api/intake/save", {
    headers: { origin: "https://example.com" }, data: {},
  });
  assert.equal(crossSite.status(), 403);
  const invalidAudio = await request("/api/intake/understand", {
    multipart: { draft: JSON.stringify(workerOrigin), intent: "extract", audio: {
      name: english("recording.webm"), mimeType: "audio/webm", buffer: Buffer.alloc(300),
    } },
  });
  assert.equal(invalidAudio.status(), 415);
  const tooLarge = await request("/api/intake/understand", {
    multipart: { draft: JSON.stringify(workerOrigin), intent: "extract", audio: {
      name: english("recording.webm"), mimeType: "audio/webm", buffer: Buffer.alloc(3_600_000),
    } },
  });
  assert.equal(tooLarge.status(), 413);
  assert.equal(audioUploads, 0);

  await page.goto(origin + "/worker/onboarding");
  await record("Start recording", "Stop recording", "");
  await alert().filter({ hasText: "No clear speech was detected" }).waitFor();
  await record("Start recording", "Stop recording", "Mera naam Nadia Ahmed hai. G-11 mein plumber hoon, pipe fitting karti hoon.");
  await heading("Apni profile tasdeeq karein").waitFor();
  await page.getByText(english("Kitne saal ka tajurba hai? How many years have you worked in this trade?"), { exact: false }).waitFor();
  assert.equal(await button("Save profile").count(), 0);
  await button("Listen to details").click();
  await page.locator("audio[aria-label='AI-generated playback']").waitFor();
  await record("Answer by voice", "Stop recording", "Mujhe saat saal ka tajurba hai.");
  await page.getByText(english("7 years"), { exact: true }).waitFor();
  await record("Confirm by voice", "Stop confirmation", "Do not save my profile");
  await alert().filter({ hasText: "No details were saved" }).waitFor();
  assert.equal((await db.query("select count(*)::int as count from workers where display_name = 'Nadia Ahmed'")).rows[0].count, 0);
  await record("Confirm by voice", "Stop confirmation", "پروفائل محفوظ کریں۔");
  await heading("Profile saved").waitFor();
  await page.getByRole("link", { name: english("View my profile") }).click();
  await heading("Saved profile").waitFor();
  await page.reload();
  await heading("Salam, Nadia Ahmed!").waitFor();

  console.log("Worker voice capture, follow-up, spoken confirmation and refresh passed.");
  await page.getByRole("link", { name: english("Update profile") }).click();
  await page.waitForURL(origin + "/worker/onboarding");
  await heading("Update your worker profile").waitFor();
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Denied for this test", "NotAllowedError"); };
  });
  await page.reload();
  await button("Start recording").click();
  await alert().filter({ hasText: "Microphone permission was denied" }).waitFor();
  await button("Enter details manually").click();
  await page.getByLabel(english("Years of experience")).fill("8");
  await button("Review details").click();
  await page.getByText(english("8 years"), { exact: true }).waitFor();
  assert.equal((await db.query("select experience_years from workers where display_name = 'Nadia Ahmed'")).rows[0].experience_years, 7);
  await button("Save profile changes").click();
  await heading("Profile saved").waitFor();
  const worker = (await db.query("select experience_years, visit_charge_pkr, skills, profile_version from workers where display_name = 'Nadia Ahmed'")).rows[0];
  assert.deepEqual(worker, { experience_years: 8, visit_charge_pkr: null, skills: ["Pipe fitting"], profile_version: 2 });
  const stale = await request("/api/intake/save", { data: {
    kind: "worker", data: { ...workerDraft, experienceYears: 7 }, method: "assisted", expectedVersion: 1,
  } });
  assert.equal(stale.status(), 409);

  console.log("Microphone-denied fallback, approved update and stale-version rejection passed.");
  const customer = await context.newPage();
  customer.on("pageerror", (error) => browserErrors.push(error.message));
  await customer.goto(origin + "/customer/home");
  await customer.getByRole("link", { name: english("Describe your job") }).click();
  rateLimited = true;
  nextTranscript = "Mere kitchen mein pipe leak ho raha hai. Mujhe aaj G-11 Islamabad mein plumber chahiye.";
  await customer.getByRole("button", { name: english("Start recording") }).click();
  await customer.getByRole("button", { name: english("Stop recording") }).waitFor();
  await wait(600);
  await customer.getByRole("button", { name: english("Stop recording") }).click();
  await customer.locator("main [role=alert]").filter({ hasText: "Voice AI is busy" }).waitFor();
  rateLimited = false;
  await customer.getByLabel(english("Or type your details")).fill(nextTranscript);
  await customer.getByRole("button", { name: english("Understand typed details") }).click();
  await customer.getByRole("heading", { name: english("Confirm your request") }).waitFor();
  await customer.getByRole("button", { name: english("Correct by voice"), exact: true }).click();
  await customer.getByRole("button", { name: english("Stop recording"), exact: true }).waitFor();
  await wait(600);
  const corrected = customer.waitForResponse((response) => response.url().endsWith("/api/intake/understand") && response.ok());
  await customer.getByRole("button", { name: english("Stop recording"), exact: true }).click();
  await corrected;
  await customer.getByText(english("Today"), { exact: true }).waitFor();
  await customer.getByText(english("2026-11-10 · exact time unspecified")).waitFor();
  await customer.getByRole("button", { name: english("Edit details"), exact: true }).click();
  await customer.getByLabel(english("Budget in PKR (optional)")).fill("2500");
  await customer.getByRole("button", { name: english("Review details") }).click();
  await customer.getByRole("button", { name: english("Save request") }).click();
  await customer.getByRole("link", { name: english("Find matching workers") }).click();
  await customer.getByRole("heading", { name: english("Your saved request") }).waitFor();
  assert.equal(await customer.locator("select[name='trade']").inputValue(), "plumber");
  assert.equal(await customer.locator("select[name='area']").inputValue(), "G-11");
  await customer.getByRole("heading", { name: english("Ali Raza") }).waitFor();
  await customer.reload();
  await customer.getByRole("heading", { name: english("Your saved request") }).waitFor();
  assert(await customer.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const stored = (await db.query("select trade, service_area, preferred_time, preferred_date::text, budget_pkr from service_requests where issue_description = 'Kitchen pipe is leaking'")).rows[0];
  assert.deepEqual(stored, { trade: "plumber", service_area: "G-11", preferred_time: null, preferred_date: "2026-11-10", budget_pkr: 2500 });

  console.log("Customer recovery, edit, saved request and matching filters passed.");
  const foreign = await (await newEnglishContext(browser)).newPage();
  await foreign.goto(customer.url());
  await foreign.getByText(english("This saved request is unavailable in this browser session.")).waitFor();
  await foreign.goto(origin + "/worker/home");
  await foreign.getByRole("heading", { name: english("Salam, Ali Raza!") }).waitFor();
  for (const width of [360, 390, 768, 1280]) {
    await foreign.setViewportSize({ width, height: 844 });
    for (const route of ["/worker/onboarding", "/customer/request"]) {
      assert.equal((await foreign.goto(origin + route)).status(), 200);
      assert(await foreign.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + " overflows at " + width);
    }
  }
  const fresh = await newEnglishContext(browser);
  const savePath = origin + "/api/intake/save";
  const newRequest = { kind: "request", data: { ...requestDraft, issueDescription: "Confirm retry is idempotent" }, draftId: crypto.randomUUID() };
  const save = () => fresh.request.post(savePath, { headers: { origin }, data: newRequest });
  assert.deepEqual(await (await save()).json(), { retry: true });
  const firstSave = await save();
  const repeated = await save();
  assert.equal(firstSave.status(), 200);
  assert.equal(repeated.status(), 200);
  assert.deepEqual(await firstSave.json(), await repeated.json());
  assert.equal((await db.query("select count(*)::int as count from service_requests where issue_description = 'Confirm retry is idempotent'")).rows[0].count, 1);
  assert.equal(speechRequests, 1);
  assert(audioUploads >= 6);
  assert(extractionRequests >= 4);
  assert.deepEqual(problems, []);
  assert.deepEqual(browserErrors, []);
  console.log("Phase 02 passed: audio upload, correction and explicit confirmation, denial and rate-limit recovery, review/edit, session isolation, refresh persistence, and request-linked discovery. OpenAI responses were stubbed.");
} finally {
  await browser?.close();
  if (next?.exitCode === null) next.kill();
  stub.close();
  await db.close();
}
