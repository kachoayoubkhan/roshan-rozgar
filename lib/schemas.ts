import { z } from "zod";
import { areas, bookingStatuses, trades } from "./types";

const id = z.uuid();
const price = z.int().positive().max(1_000_000);
const dateTime = z.iso.datetime({ offset: true });

export const workerProfileSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  trade: z.enum(trades),
  experienceYears: z.int().min(0).max(80),
  serviceArea: z.enum(areas),
  visitChargePkr: price.nullable(),
  skills: z.array(z.string().trim().min(1).max(80)).max(10),
});

export const customerRequestSchema = z.strictObject({
  trade: z.enum(trades),
  issueDescription: z.string().trim().min(1).max(1500),
  serviceArea: z.enum(areas),
  urgency: z.enum(["today", "soon", "flexible"]),
  preferredTime: dateTime.nullable(),
  preferredDate: z.iso.date().nullable(),
  budgetPkr: price.nullable(),
});

export const quoteSchema = z.strictObject({ requestId: id, workerId: id, amountPkr: price });
export const bookingConfirmationSchema = z.strictObject({ quoteId: id, scheduledTime: dateTime });
export const bookingSchema = bookingConfirmationSchema.extend({
  id, requestId: id, workerId: id, customerId: id,
  agreedAmountPkr: price, status: z.enum(bookingStatuses),
});

export const reviewSchema = z.strictObject({
  bookingId: id,
  rating: z.int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export const discoveryFiltersSchema = z.object({
  trade: z.enum(trades).optional().catch(undefined),
  area: z.enum(areas).default("G-11").catch("G-11"),
  radius: z.enum(["3", "5"]).default("5").catch("5"),
});
