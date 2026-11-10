import "server-only";
import { z } from "zod";
import { areaCenters, distanceKm, findDemoWorkers } from "@/lib/demo-workers";
import { readSession } from "@/lib/intake/session";
import { areas, trades, type Area, type Trade } from "@/lib/types";
import type { DiscoveryWorker } from "./worker";
import { marketplaceDb } from "./store";

const rowSchema = z.object({
  id: z.uuid(), display_name: z.string(), trade: z.enum(trades), service_area: z.enum(areas),
  experience_years: z.number(), visit_charge_pkr: z.number().nullable(),
  latitude: z.number(), longitude: z.number(), onboarding_method: z.string(),
  review_count: z.coerce.number(), average_rating: z.coerce.number().nullable(),
});

export async function discoverWorkers(area: Area, radius: number, trade?: Trade): Promise<{ workers: DiscoveryWorker[]; preview: boolean }> {
  try {
    const actor = await readSession();
    const query = marketplaceDb().from("marketplace_discovery").select(
      "id,display_name,trade,service_area,experience_years,visit_charge_pkr,latitude,longitude,onboarding_method,review_count,average_rating",
    ).eq("bookable", true);
    if (trade) query.eq("trade", trade);
    const { data, error } = await query;
    if (error) throw error;
    const workers = z.array(rowSchema).parse(data).filter((row) => row.id !== actor).map((row) => ({
      id: row.id, name: row.display_name, trade: row.trade, serviceArea: row.service_area,
      experienceYears: row.experience_years, visitChargePkr: row.visit_charge_pkr,
      distanceKm: distanceKm(areaCenters[area], [row.latitude, row.longitude]),
      reviewCount: row.review_count, rating: row.average_rating,
      example: row.onboarding_method === "seed",
    })).filter((worker) => worker.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm || (b.rating ?? 0) - (a.rating ?? 0));
    return { workers, preview: false };
  } catch {
    return { workers: findDemoWorkers(area, radius, trade).map((worker) => ({
      ...worker, example: true, reviewCount: worker.exampleRatings.length,
      rating: worker.exampleRatings.length
        ? worker.exampleRatings.reduce((sum, value) => sum + value, 0) / worker.exampleRatings.length : null,
    })), preview: true };
  }
}
