import { english, newEnglishContext } from "./language-context.mjs";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.DEMO_ORIGIN ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const stamp = new Date().toISOString();
try {
  const worker = await newEnglishContext(browser);
  const customer = await newEnglishContext(browser);
  const wp = await worker.newPage();
  const cp = await customer.newPage();
  const post = (context, path, body) => context.request.post(origin + path, { headers: { origin }, data: body });
  async function save(context, body) {
    let response = await post(context, "/api/intake/save", body);
    assert.equal(response.status(), 200);
    let result = await response.json();
    if (result.retry) {
      response = await post(context, "/api/intake/save", body);
      assert.equal(response.status(), 200);
      result = await response.json();
    }
    return result;
  }
  async function action(context, data) {
    const response = await post(context, "/api/jobs", data);
    if (!response.ok()) throw Error("Hosted action " + data.action + " failed: HTTP " + response.status());
    return response.json();
  }
  const name = "Demo plumber " + stamp;
  await save(worker, { kind: "worker", method: "assisted", expectedVersion: null,
    data: { name, trade: "plumber", experienceYears: 5, serviceArea: "G-11", visitChargePkr: 2500, skills: ["Pipe fitting"] } });
  await action(worker, { action: "availability", online: true });
  const request = await save(customer, { kind: "request", draftId: crypto.randomUUID(),
    data: { trade: "plumber", issueDescription: "Hosted demo kitchen pipe leak " + stamp, serviceArea: "G-11",
      urgency: "today", preferredTime: null, preferredDate: null, budgetPkr: null } });
  const requestId = new URL(request.href, origin).searchParams.get("request");
  await cp.goto(origin + request.href);
  const heading = cp.getByRole("heading", { name: english(name), exact: true });
  await heading.waitFor();
  await heading.locator("xpath=../../..").getByRole("button", { name: english("Request this worker") }).click();
  await cp.getByRole("heading", { name: english("Messages"), exact: true }).waitFor();
  await action(customer, { action: "message", requestId, text: "Please repair the kitchen pipe." });
  const path = "/worker/jobs/" + requestId;
  await wp.goto(origin + path);
  await wp.getByText(english("Please repair the kitchen pipe."), { exact: true }).waitFor();
  const quote = await action(worker, { action: "quote", requestId, quoteId: null, amount: 2500 });
  await action(customer, { action: "accept", requestId, quoteId: quote.id });
  await action(customer, { action: "confirm", requestId, quoteId: quote.id, time: new Date(Date.now() + 86400000).toISOString() });
  await wp.reload();
  await wp.getByRole("heading", { name: english("Booking details"), exact: true }).waitFor();
  await action(worker, { action: "start", requestId });
  await action(worker, { action: "complete", requestId });
  await cp.reload();
  await cp.getByRole("button", { name: english("Submit review"), exact: true }).click();
  await cp.getByText(english("Your review"), { exact: true }).waitFor();
  await cp.reload();
  await cp.getByText(english("5 / 5"), { exact: true }).waitFor();
  await wp.goto(origin + "/worker/home");
  await wp.getByText(english("5 average"), { exact: true }).waitFor();
  await wp.reload();
  await wp.getByText(english("5 average"), { exact: true }).waitFor();
  await cp.goto(origin + "/customer/workers?trade=plumber&area=G-11");
  await cp.getByRole("heading", { name: english(name), exact: true }).waitFor();
  await action(worker, { action: "availability", online: false });
  console.log("Hosted worker → request → message → quote → booking → completion → review passed. Rating survives refresh.");
  console.log("One clearly named completed demo job remains in the hosted database; its worker is offline.");
} finally {
  await browser.close();
}
