import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { mkdir } from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import { chromium } from "playwright";
import { messages } from "../lib/i18n/messages.ts";

const locales = ["ur", "roman", "en"];
const languageNames = { ur: "اردو", roman: "Roman Urdu", en: "English" };
const t = (language, key) => messages[key][language];
for (const [key, value] of Object.entries(messages)) {
  const slots = (text) => [...text.matchAll(/\{\w+\}/g)].map(([slot]) => slot).sort();
  for (const language of locales) {
    assert.equal(typeof value[language], "string", key);
    assert.deepEqual(slots(value[language]), slots(key), key + " placeholders");
  }
}
const reserve = createServer();
reserve.listen(0, "127.0.0.1");
await once(reserve, "listening");
const port = reserve.address().port;
await new Promise((resolve) => reserve.close(resolve));
const origin = "http://127.0.0.1:" + port;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  stdio: "inherit",
  env: {
    ...process.env, OPENAI_API_KEY: "localization-test-only",
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9",
    SUPABASE_SERVICE_ROLE_KEY: "localization-test-only",
    DEMO_SESSION_SECRET: "localization-test-session-secret-long-enough",
  },
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 50 && server.exitCode === null; i++) {
    if (await fetch(origin).then((response) => response.ok).catch(() => false)) { ready = true; break; }
    await wait(200);
  }
  assert(ready, "Production server starts");
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined, args: ["--use-fake-device-for-media-stream"] });
  const context = await browser.newContext({ permissions: ["microphone"], viewport: { width: 390, height: 844 } });
  await context.addInitScript(() => {
    Object.defineProperty(window.speechSynthesis, "getVoices", { value: () => [] });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let language = "ur";
  const speechCalls = [];
  const saves = [];
  await page.route("**/api/intake/speak", async (route) => {
    const body = route.request().postDataJSON();
    assert.equal(body.language, language === "en" ? "en" : "ur");
    assert(body.text.length);
    speechCalls.push(body);
    await route.fulfill({ status: 200, contentType: "audio/mpeg", body: Buffer.from("test audio") });
  });
  await page.route("**/api/intake/save", async (route) => {
    saves.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ href: "/worker/home" }) });
  });
  await page.goto(origin);
  await page.getByRole("heading", { name: t("ur", "How would you like to start?") }).waitFor();
  assert.equal(await page.locator("html").getAttribute("lang"), "ur");
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");

  for (const selected of ["en", "roman", "ur"]) {
    language = selected;
    await page.waitForURL((url) => url.pathname === "/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    let navigations = 0;
    const listener = () => navigations++;
    page.on("framenavigated", listener);
    await page.getByRole("button", { name: languageNames[language], exact: true }).click();
    await page.getByRole("heading", { name: t(language, "How would you like to start?") }).waitFor();
    assert.equal(navigations, 0, "Switching never reloads the document");
    page.off("framenavigated", listener);
    assert.equal(await page.getByRole("button", { name: languageNames[language], exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.evaluate(() => localStorage.getItem("roshan-rozgar.language")), language);
    await page.reload();
    await page.getByRole("heading", { name: t(language, "How would you like to start?") }).waitFor();
    assert.equal(await page.locator("html").getAttribute("dir"), language === "ur" ? "rtl" : "ltr");
    await page.getByRole("link", { name: t(language, "Continue as worker"), exact: true }).click();
    await page.getByRole("heading", { name: t(language, "Apni maloomat awaz mein batayein"), exact: true }).waitFor();
    await page.getByRole("button", { name: t(language, "Listen to instructions"), exact: true }).click();
    await page.locator("audio").waitFor();
    await page.getByRole("button", { name: t(language, "Enter details manually"), exact: true }).click();
    await page.getByRole("button", { name: t(language, "Review details"), exact: true }).click();
    const validation = page.locator("p[role='alert']");
    await validation.waitFor();
    assert(!(await validation.innerText()).includes("What is your full name?") || language === "en");
    const field = (name) => page.locator("label").filter({ hasText: name });
    await field(t(language, "Full name")).locator("input").fill("Language test worker");
    await field(t(language, "Service")).locator("select").selectOption("plumber");
    await field(t(language, "Neighbourhood")).locator("select").selectOption("G-11");
    await field(t(language, "Years of experience")).locator("input").fill("5");
    await page.getByRole("button", { name: t(language, "Review details"), exact: true }).click();
    await page.locator("h2.section-title", { hasText: t(language, "Apni profile tasdeeq karein") }).waitFor();
    for (const next of ["roman", "en", "ur", language]) {
      await page.getByRole("button", { name: languageNames[next], exact: true }).click();
      await page.locator("h2.section-title", { hasText: t(next, "Apni profile tasdeeq karein") }).waitFor();
      await page.getByText("Language test worker", { exact: true }).waitFor();
      assert.equal(saves.length, selected === "en" ? 0 : selected === "roman" ? 1 : 2, "Switching language never writes a record");
    }
    await page.getByRole("button", { name: t(language, "Save profile"), exact: true }).click();
    await page.locator("h2.section-title", { hasText: t(language, "Profile saved") }).waitFor();
    assert.deepEqual(saves.at(-1).data, { name: "Language test worker", trade: "plumber", experienceYears: 5, serviceArea: "G-11", visitChargePkr: null, skills: [] });
    await page.getByRole("link", { name: "Roshan Rozgar", exact: true }).click();
  }

  for (const selected of locales) {
    language = selected;
    await page.getByRole("button", { name: languageNames[language], exact: true }).click();
    for (const width of [360, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      for (const path of ["/", "/worker/onboarding", "/worker/home", "/customer/home", "/customer/request", "/customer/workers", "/customer/bookings"]) {
        assert.equal((await page.goto(origin + path)).status(), 200);
        await page.getByRole("button", { name: languageNames[language], exact: true }).waitFor();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), language + path + width);
        assert.equal(await page.locator("html").getAttribute("dir"), language === "ur" ? "rtl" : "ltr");
      }
    }
  }
  await mkdir(".next/localization-qa", { recursive: true });
  await page.goto(origin + "/customer/request");
  await page.setViewportSize({ width: 360, height: 844 });
  await page.getByRole("button", { name: languageNames.ur, exact: true }).click();
  await page.screenshot({ path: ".next/localization-qa/urdu-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: languageNames.en, exact: true }).click();
  await page.screenshot({ path: ".next/localization-qa/english-desktop.png", fullPage: true });
  assert.equal(speechCalls.length, 3);
  assert.deepEqual(errors, []);
  console.log("Localization passed: three languages, immediate switching, persistence, RTL/LTR, worker review, canonical save values, speech language requests, errors and 84 responsive route checks. Speech responses were stubbed.");
} finally {
  await browser?.close();
  server.kill();
}
