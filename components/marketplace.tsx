import Link from "next/link";
import { ArrowUpRight, Droplets, Hammer, MapPin, Snowflake, Star, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
import type { DiscoveryWorker } from "@/lib/jobs/worker";
import type { Trade } from "@/lib/types";
import { cn } from "@/lib/utils";

export const services = {
  plumber: { label: "Plumber", detail: "Leaks & pipes", icon: Droplets, tone: "bg-sky-50 text-sky-800" },
  electrician: { label: "Electrician", detail: "Wiring & repairs", icon: Zap, tone: "bg-amber-50 text-amber-800" },
  "ac-technician": { label: "AC technician", detail: "Cooling & service", icon: Snowflake, tone: "bg-teal-50 text-teal-800" },
  carpenter: { label: "Carpenter", detail: "Furniture & fittings", icon: Hammer, tone: "bg-orange-50 text-orange-800" },
} satisfies Record<Trade, { label: string; detail: string; icon: typeof Hammer; tone: string }>;

export function ServiceTile({ trade }: { trade: Trade }) {
  const { label, detail, icon: Icon, tone } = services[trade];
  return (
    <Link href={`/customer/workers?trade=${trade}`} className="group flex min-h-24 flex-col items-start gap-2.5 rounded-card border border-line bg-white p-3.5 transition-colors hover:border-primary sm:flex-row sm:items-center sm:p-4">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tone)}><Icon size={20} aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm sm:text-base">{label}</strong>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
      <ArrowUpRight size={16} className="hidden shrink-0 text-deep group-hover:visible xl:invisible xl:block" aria-hidden />
    </Link>
  );
}

export function WorkerCard({ worker, action }: { worker: DiscoveryWorker; action?: ReactNode }) {
  const { label, icon: Icon } = services[worker.trade];
  const rating = worker.rating?.toFixed(1);
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-mint text-sm font-bold text-deep" aria-hidden>
          {worker.name.split(" ").map((part) => part[0]).join("")}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{worker.name}</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted"><Icon size={15} aria-hidden />{label}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1"><MapPin size={15} aria-hidden />{worker.distanceKm.toFixed(1)} km</span>
        {rating && <span className="flex items-center gap-1"><Star size={15} className="fill-amber-400 text-amber-700" aria-hidden />{rating} ({worker.reviewCount} {worker.example ? "demo reviews" : "reviews"})</span>}
        {!rating && <span>No reviews yet</span>}
      </div>
      <p className="text-sm text-muted">{worker.experienceYears} years of experience (self-reported)</p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
        <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-deep">{worker.example ? "Example profile" : "Available"}</span>
        <span className="font-semibold">{worker.visitChargePkr === null ? "Ask for price" : "Visit from Rs. " + worker.visitChargePkr.toLocaleString("en-PK")}</span>
      </div>
      {action}
    </Card>
  );
}

export function DemoLabel() {
  return <span className="inline-flex w-fit rounded-full border border-line bg-white px-3 py-1 text-xs font-semibold text-muted">Seeded demo data</span>;
}
