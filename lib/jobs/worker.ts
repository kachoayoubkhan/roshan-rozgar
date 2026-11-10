import type { WorkerProfile } from "@/lib/types";

export type DiscoveryWorker = Omit<WorkerProfile, "skills"> & {
  id: string;
  distanceKm: number;
  reviewCount: number;
  rating: number | null;
  example: boolean;
};
