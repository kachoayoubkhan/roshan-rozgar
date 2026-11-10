import { z } from "zod";
import { areas, trades } from "../types";
import { customerRequestSchema, workerProfileSchema } from "../schemas";

export const intakeKind = z.enum(["worker", "request"]);
export type IntakeKind = z.infer<typeof intakeKind>;

export const workerDraft = z.strictObject({
  name: workerProfileSchema.shape.name.nullable(),
  trade: z.enum(trades).nullable(),
  experienceYears: workerProfileSchema.shape.experienceYears.nullable(),
  serviceArea: z.enum(areas).nullable(),
  visitChargePkr: workerProfileSchema.shape.visitChargePkr,
  skills: workerProfileSchema.shape.skills,
});

export const requestDraft = z.strictObject({
  trade: z.enum(trades).nullable(),
  issueDescription: customerRequestSchema.shape.issueDescription.nullable(),
  serviceArea: z.enum(areas).nullable(),
  urgency: customerRequestSchema.shape.urgency.nullable(),
  preferredTime: customerRequestSchema.shape.preferredTime,
  preferredDate: customerRequestSchema.shape.preferredDate,
  budgetPkr: customerRequestSchema.shape.budgetPkr,
});

export const intakeDraft = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("worker"), data: workerDraft }),
  z.strictObject({ kind: z.literal("request"), data: requestDraft }),
]);
export type IntakeDraft = z.infer<typeof intakeDraft>;

export const saveIntakeSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("worker"), data: workerProfileSchema,
    expectedVersion: z.int().positive().max(2147483646).nullable(),
    method: z.enum(["voice", "assisted"]),
  }),
  z.strictObject({ kind: z.literal("request"), data: customerRequestSchema, draftId: z.uuid() }),
]);
export type SaveIntake = z.infer<typeof saveIntakeSchema>;

export const intentSchema = z.enum(["extract", "confirm"]);
export const textInput = z.string().trim().min(1).max(2000);
export const draftReply = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("extract"), draft: intakeDraft, transcript: textInput }),
  z.strictObject({ mode: z.literal("confirm"), confirmed: z.boolean() }),
]);

export const maxAudioBytes = 3_500_000;
export const audioExtensions: Readonly<Record<string, string>> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

export function emptyDraft(kind: IntakeKind): IntakeDraft {
  if (kind === "worker") return { kind, data: { name: null, trade: null, experienceYears: null, serviceArea: null, visitChargePkr: null, skills: [] } };
  return { kind, data: { trade: null, issueDescription: null, serviceArea: null, urgency: null, preferredTime: null, preferredDate: null, budgetPkr: null } };
}

export function validateDraft(draft: IntakeDraft) {
  return draft.kind === "worker"
    ? workerProfileSchema.safeParse(draft.data)
    : customerRequestSchema.safeParse(draft.data);
}

export function voiceConfirmed(kind: IntakeKind, transcript: string) {
  const normalized = transcript.normalize("NFKC").toLowerCase()
    .replace(/[\p{P}\p{M}]/gu, "").replace(/\s+/g, " ").trim();
  return (kind === "worker"
    ? ["save my profile", "profile save karein", "profile save kar dein", "پروفائل محفوظ کریں", "پروفائل سیو کریں"]
    : ["save my request", "request save karein", "request save kar dein", "درخواست محفوظ کریں", "ریکویسٹ سیو کریں"]
  ).includes(normalized);
}
