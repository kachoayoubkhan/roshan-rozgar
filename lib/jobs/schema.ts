import { z } from "zod";
import { areas, bookingStatuses, trades } from "@/lib/types";

const id = z.uuid();
const requestId = { requestId: id };
const quoteId = { quoteId: id };
const price = z.int().min(1).max(1_000_000);
export const messageText = z.string().trim().min(1).max(4000);
export const roleSchema = z.enum(["customer", "worker"]);
export type JobRole = z.infer<typeof roleSchema>;
const requestStatus = z.enum(["open", "quoted", "price_agreed", "booked", "declined", "cancelled"]);
const bookingStatus = z.enum(bookingStatuses);

export const jobAction = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("availability"), online: z.boolean() }),
  z.strictObject({ action: z.literal("select"), ...requestId, workerId: id }),
  z.strictObject({ action: z.literal("message"), ...requestId, text: messageText }),
  z.strictObject({ action: z.literal("quote"), ...requestId, quoteId: id.nullable(), amount: price }),
  z.strictObject({ action: z.enum(["accept", "revise"]), ...requestId, ...quoteId }),
  z.strictObject({ action: z.literal("confirm"), ...requestId, ...quoteId, time: z.iso.datetime({ offset: true }) }),
  z.strictObject({ action: z.enum(["start", "complete", "cancel", "decline"]), ...requestId }),
  z.strictObject({
    action: z.literal("review"),
    ...requestId,
    rating: z.int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  }),
]);
export type JobAction = z.infer<typeof jobAction>;

const jobSummary = z.object({
  id, trade: z.enum(trades), problem: z.string(), area: z.enum(areas), status: requestStatus, worker: z.string(),
  booking_status: bookingStatus.nullable(), booking_id: id.nullable(), amount: price.nullable(), scheduled_time: z.string().nullable(),
});
export const jobList = z.array(jobSummary);
export type JobSummary = z.infer<typeof jobSummary>;

export const jobSchema = jobSummary.omit({ booking_status: true, booking_id: true, amount: true, scheduled_time: true }).extend({
  role: roleSchema, customer: z.string(), urgency: z.enum(["today", "soon", "flexible"]),
  preferred_time: z.string().nullable(), preferred_date: z.string().nullable(), budget_pkr: price.nullable(),
  quote: z.object({ id, amount: price, status: z.enum(["proposed", "accepted"]) }).nullable(),
  booking: z.object({ id, amount: price, status: bookingStatus, time: z.string() }).nullable(),
  review: z.object({
    rating: z.int().min(1).max(5),
    comment: z.string().nullable(),
    created_at: z.string(),
  }).nullable().optional().transform((value) => value ?? null),
  messages: z.array(z.object({ id, sender_role: roleSchema, message_text: z.string(), created_at: z.string() })),
});
export type Job = z.infer<typeof jobSchema>;

export function jobHref(role: JobRole, id: string) {
  return role === "customer" ? `/customer/jobs/${id}/chat` : `/worker/jobs/${id}`;
}

const statusLabels: Record<Job["status"] | NonNullable<Job["booking"]>["status"], string> = {
  open: "Requested", quoted: "Quoted", price_agreed: "Quote accepted", booked: "Booked",
  confirmed: "Confirmed", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled", declined: "Declined",
};
export function jobStatus(status: keyof typeof statusLabels) {
  return statusLabels[status];
}
