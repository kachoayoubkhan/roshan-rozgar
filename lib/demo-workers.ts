import type { Area, Trade, WorkerProfile } from "./types";

export const areaCenters: Record<Area, [number, number]> = {
  "G-11": [33.667, 72.995],
  "G-10": [33.675, 73.012],
  "F-10": [33.695, 73.012],
};

type DemoWorker = Omit<WorkerProfile, "skills" | "visitChargePkr"> & { visitChargePkr: number } & {
  id: string;
  coordinates: [number, number];
  online: boolean;
  activeBooking: boolean;
  exampleRatings: number[];
};

const demoWorkers: DemoWorker[] = [
  { id: "ali", name: "Ali Raza", trade: "plumber", serviceArea: "G-11", coordinates: [33.675, 73.004], online: true, activeBooking: false, experienceYears: 5, visitChargePkr: 2500, exampleRatings: [5, 5, 4, 5, 5] },
  { id: "imran", name: "Imran Khan", trade: "plumber", serviceArea: "G-10", coordinates: [33.677, 73.016], online: true, activeBooking: false, experienceYears: 7, visitChargePkr: 2700, exampleRatings: [] },
  { id: "waqas", name: "Waqas Ahmed", trade: "plumber", serviceArea: "F-10", coordinates: [33.693, 73.013], online: true, activeBooking: false, experienceYears: 4, visitChargePkr: 2800, exampleRatings: [] },
  { id: "sana", name: "Sana Akram", trade: "electrician", serviceArea: "G-11", coordinates: [33.673, 72.986], online: true, activeBooking: false, experienceYears: 6, visitChargePkr: 2000, exampleRatings: [] },
  { id: "bilal", name: "Bilal Aslam", trade: "ac-technician", serviceArea: "G-10", coordinates: [33.673, 73.011], online: true, activeBooking: true, experienceYears: 4, visitChargePkr: 3000, exampleRatings: [] },
  { id: "farah", name: "Farah Noor", trade: "carpenter", serviceArea: "F-10", coordinates: [33.696, 73.012], online: false, activeBooking: false, experienceYears: 3, visitChargePkr: 2300, exampleRatings: [] },
];

export function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]) {
  const radians = (value: number) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function findDemoWorkers(area: Area, radius: number, trade?: Trade) {
  return demoWorkers
    .filter((worker) => worker.online && !worker.activeBooking && (!trade || worker.trade === trade))
    .map((worker) => ({ ...worker, distanceKm: distanceKm(areaCenters[area], worker.coordinates) }))
    .filter((worker) => worker.distanceKm <= radius)
    .sort((first, second) => first.distanceKm - second.distanceKm);
}

export type DemoWorkerMatch = ReturnType<typeof findDemoWorkers>[number];
