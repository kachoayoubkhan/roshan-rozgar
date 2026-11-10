import type { IntakeDraft, IntakeKind } from "./schema";
import type { Area, Trade } from "../types";

export const tradeNames: Record<Trade, string> = {
  plumber: "Plumber", electrician: "Electrician", "ac-technician": "AC technician", carpenter: "Carpenter",
};

const tradeUrdu: Record<Trade, string> = {
  plumber: "پلمبر", electrician: "الیکٹریشن", "ac-technician": "اے سی ٹیکنیشن", carpenter: "بڑھئی",
};

const areaUrdu: Record<Area, string> = { "G-11": "جی گیارہ", "G-10": "جی دس", "F-10": "ایف دس" };
export const urgencyNames = { today: "Today", soon: "Soon", flexible: "Flexible" } as const;
const urgencyUrdu = { today: "آج", soon: "جلد", flexible: "وقت مقرر نہیں" } as const;

export const prompts = {
  worker: {
    hint: "Say your name, trade, years of experience and area. You can add your skills and visit charge.",
    urdu: "اپنا پورا نام، ہنر، کتنے سال کا تجربہ ہے اور علاقہ بتائیں۔ چاہیں تو مہارت اور آنے کی فیس بھی بتائیں۔",
    example: "Mera naam Ali Raza hai. Main G-11 mein plumber hoon, paanch saal ka tajurba hai. Pipe fitting karta hoon.",
  },
  request: {
    hint: "Describe the problem, your area and how soon you need help. Add a time or budget if you have one.",
    urdu: "اپنا مسئلہ، علاقہ، اور بتائیں کہ مدد کتنی جلدی چاہیے۔ اگر وقت یا بجٹ طے ہے تو وہ بھی بتائیں۔",
    example: "Mere kitchen mein pipe leak ho raha hai. Mujhe aaj G-11 Islamabad mein plumber chahiye.",
  },
};

export function followUp(draft: IntakeDraft) {
  if (draft.kind === "worker") {
    if (!draft.data.name) return { text: "Apna poora naam batayein. What is your full name?", urdu: "اپنا پورا نام بتائیں۔" };
    if (!draft.data.trade) return { text: "Apna hunar batayein. What is your trade?", urdu: "اپنا ہنر بتائیں۔ آپ پلمبر، الیکٹریشن، اے سی ٹیکنیشن، یا بڑھئی ہیں؟" };
    if (draft.data.experienceYears === null) return { text: "Kitne saal ka tajurba hai? How many years have you worked in this trade?", urdu: "آپ کو اس کام میں کتنے سال کا تجربہ ہے؟" };
  } else if (!draft.data.issueDescription || !draft.data.trade) {
    return { text: "Masla aur kaam batayein. What needs fixing?", urdu: "کیا مسئلہ ہے اور کون سا کام کروانا ہے؟" };
  }
  if (!draft.data.serviceArea) return { text: "Apna ilaqa batayein. Choose G-11, G-10 or F-10 in Islamabad.", urdu: "اسلام آباد میں اپنا علاقہ بتائیں۔ جی گیارہ، جی دس یا ایف دس؟" };
  if (draft.kind === "request" && !draft.data.urgency) return { text: "Madad kab chahiye? Do you need help today, soon, or is the timing flexible?", urdu: "آپ کو مدد کب چاہیے؟ آج، جلد، یا وقت کی پابندی نہیں؟" };
  return null;
}

export const confirmPhrases: Record<IntakeKind, { latin: string; urdu: string }> = {
  worker: { latin: "Profile save karein", urdu: "پروفائل محفوظ کریں" },
  request: { latin: "Request save karein", urdu: "درخواست محفوظ کریں" },
};

export function preferredTimeLabel(value: string, locale = "en-PK") {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value));
}

export function readBack(draft: IntakeDraft) {
  const common = [
    draft.data.trade ? `کام: ${tradeUrdu[draft.data.trade]}۔` : "",
    draft.data.serviceArea ? `علاقہ: ${areaUrdu[draft.data.serviceArea]}، اسلام آباد۔` : "",
  ];
  const values = draft.kind === "worker" ? [
    draft.data.name ? `نام: ${draft.data.name}۔` : "",
    ...common,
    draft.data.experienceYears === null ? "" : `تجربہ: ${draft.data.experienceYears} سال۔`,
    draft.data.visitChargePkr === null ? "" : `آنے کی فیس: ${draft.data.visitChargePkr} روپے۔`,
    draft.data.skills.length ? `مہارت: ${draft.data.skills.join("، ")}۔` : "",
  ] : [
    ...common,
    draft.data.issueDescription ? `مسئلہ: ${draft.data.issueDescription}۔` : "",
    draft.data.urgency ? `کتنی جلدی: ${urgencyUrdu[draft.data.urgency]}۔` : "",
    draft.data.preferredTime ? `وقت: ${preferredTimeLabel(draft.data.preferredTime, "ur-PK")}۔` :
      draft.data.preferredDate ? `تاریخ: ${draft.data.preferredDate}۔ وقت ابھی طے نہیں۔` : "",
    draft.data.budgetPkr === null ? "" : `بجٹ: ${draft.data.budgetPkr} روپے۔`,
  ];
  const next = followUp(draft)?.urdu ?? `اگر تفصیل درست ہے تو کہیں: ${confirmPhrases[draft.kind].urdu}۔`;
  return [...values, next].filter(Boolean).join(" ");
}
