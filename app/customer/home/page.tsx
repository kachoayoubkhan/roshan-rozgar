import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Text } from "@/components/i18n/provider";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin, Mic, Search } from "lucide-react";
import { DemoLabel, ServiceTile, WorkerCard } from "@/components/marketplace";
import { Neighborhood } from "@/components/neighborhood";
import { Button } from "@/components/ui/button";
import { discoverWorkers } from "@/lib/jobs/discovery";
import { trades } from "@/lib/types";

export const metadata: Metadata = { title: "Customer home" };

export default async function CustomerHome() {
  const { workers, preview } = await discoverWorkers("G-11", 5);
  const nearby = workers.slice(0, 3);

  return (
    <>
      <section className="hero" aria-labelledby="customer-heading">
        <div className="hero-copy">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-deep"><MapPin size={16} aria-hidden /> <Text k="G-11, Islamabad" /> </p>
          <h1 id="customer-heading" className="page-title"> <Text k="Find skilled workers near you." /> </h1>
          <p className="mt-3 max-w-lg text-muted sm:text-lg"> <Text k="Qareebi hunarmand dhoondein. Browse plumbing, electrical, AC and carpentry help." /> </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button asChild><Link href="/customer/request"><Mic aria-hidden /> <Text k="Describe your job" /> </Link></Button>
            <Button asChild variant="outline"><Link href="/customer/workers"><Search aria-hidden /> <Text k="Browse workers" /> </Link></Button>
          </div>

        </div>
        <Neighborhood />
      </section>
      <section className="mt-7 sm:mt-9" aria-labelledby="services-heading">
        <h2 id="services-heading" className="section-title mb-4"> <Text k="Popular services" /> </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{trades.map((trade) => <ServiceTile key={trade} trade={trade} />)}</div>
      </section>
      <section className="mt-7 sm:mt-9" aria-labelledby="nearby-heading">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="nearby-heading" className="section-title mb-2"> <Text k="Nearby workers" /> </h2>
            {preview && <DemoLabel />}
          </div>
          <Button asChild variant="outline"><Link href="/customer/workers"> <Text k="View all" /> <ArrowRight aria-hidden /></Link></Button>
        </div>
        {!nearby.length && (
          <EmptyState icon={SearchX} title={<Text k="No workers are available nearby right now." />} description={<Text k="Try a wider distance, a different neighbourhood, or another service." />}>
            <Button asChild variant="outline"><Link href="/customer/workers"><Text k="Browse workers" /></Link></Button>
          </EmptyState>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{nearby.map((worker) => <WorkerCard key={worker.id} worker={worker} />)}</div>
      </section>
    </>
  );
}
