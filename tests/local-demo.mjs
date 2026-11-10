import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const origin = process.env.DEMO_ORIGIN ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
try {
  const page = await browser.newPage();
  const errors = [];
  const failedAssets = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/_next/") && response.status() >= 400) {
      failedAssets.push(response.status() + " " + new URL(response.url()).pathname);
    }
  });
  await page.goto(origin);
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("link", { name: "Continue as customer", exact: true }).click();
  await page.waitForURL(origin + "/customer/home");
  await page.getByRole("link", { name: "Browse workers", exact: true }).first().click();
  await page.waitForURL(origin + "/customer/workers");
  await page.getByRole("link", { name: "Describe your job", exact: true }).click();
  await page.waitForURL(origin + "/customer/request");
  await page.getByRole("button", { name: "Enter details manually", exact: true }).click();
  await page.getByLabel("Service").selectOption("plumber");
  assert.equal(await page.getByLabel("Service").inputValue(), "plumber");

  for (const language of ["English", "اردو"]) {
    await page.getByRole("button", { name: language, exact: true }).click();
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      for (const route of ["/", "/worker/onboarding", "/worker/home", "/customer/home", "/customer/request", "/customer/workers", "/customer/bookings"]) {
        assert.equal((await page.goto(origin + route)).status(), 200);
        await page.getByRole("button", { name: language, exact: true }).waitFor();
        assert.equal(await page.locator('button[aria-pressed="true"]').innerText(), language);
        await page.locator("main h1").waitFor();
        assert.equal(await page.locator("main h1").count(), 1, route);
        assert.equal(await page.locator("main [role=alert]").count(), 0, "No page error at " + route);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route + " overflows");
      }
    }
  }
  await mkdir(".next/ui-qa", { recursive: true });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto(origin + "/customer/workers");
  await page.locator("main h1").waitFor();
  await page.screenshot({ path: ".next/ui-qa/discovery-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/worker/onboarding");
  await page.locator("main h1").waitFor();
  await page.screenshot({ path: ".next/ui-qa/onboarding-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, [], "All actual demo JS, CSS and font requests must succeed");
  console.log("Actual localhost demo passed: client navigation, request entry, language switching, 28 responsive route checks, and zero JavaScript/style/font failures.");
} finally {
  await browser.close();
}

