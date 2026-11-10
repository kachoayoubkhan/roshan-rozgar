import { messages } from "../lib/i18n/messages.ts";

export const english = (value) => messages[value]?.en ?? value;

// Existing English-language regression flows retain their original assertions.
export async function newEnglishContext(browser, options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    localStorage.setItem("roshan-rozgar.language", "en");
  });
  return context;
}
