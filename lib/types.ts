import type { z } from "zod";
import type { bookingSchema, customerRequestSchema, quoteSchema, reviewSchema, workerProfileSchema } from "./schemas";

export const trades = ["plumber", "electrician", "ac-technician", "carpenter"] as const;
export const areas = ["G-11", "G-10", "F-10"] as const;
export const bookingStatuses = ["confirmed", "in_progress", "completed", "cancelled"] as const;

export type Trade = (typeof trades)[number];
export type Area = (typeof areas)[number];
export type BookingStatus = (typeof bookingStatuses)[number];
export type WorkerProfile = z.infer<typeof workerProfileSchema>;
export type CustomerRequest = z.infer<typeof customerRequestSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type Review = z.infer<typeof reviewSchema>;
