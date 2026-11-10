import { Text, Label } from "@/components/i18n/provider";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Details } from "@/components/intake/details";
import { getRequest } from "@/lib/intake/store";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { DemoLabel, services, WorkerCard } from "@/components/marketplace";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { discoverWorkers } from "@/lib/jobs/discovery";
import { jobHref } from "@/lib/jobs/schema";
import { SelectWorker } from "@/components/jobs/actions";
import { discoveryFiltersSchema } from "@/lib/schemas";
import { areas, trades } from "@/lib/types";

export const metadata: Metadata = { title: "Find workers" };

export default async function FindWorkers({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestId = z.uuid().safeParse(query.request);
  const saved = requestId.success ? await getRequest(requestId.data).catch(() => null) : null;
  const { area, trade, radius } = discoveryFiltersSchema.parse({
    ...query,
    area: query.area ?? saved?.request.serviceArea,
    trade: query.trade ?? saved?.request.trade,
  });
  const reset = saved ? "/customer/workers?request=" + saved.id : "/customer/workers";
  const { workers, preview } = await discoverWorkers(area, Number(radius), trade);

  return (
    <>
      <div className="mb-6 sm:mb-8">
        {preview && <DemoLabel />}
        <h1 className="page-title mt-3"> <Text k="Qareeb dastiyab hunarmand" /> </h1>
        <p className="mt-3 max-w-xl text-muted"> <Text k="Find available workers by trade and distance from an Islamabad neighbourhood." /> </p>
      </div>
      {saved && (
        <Card className="mb-5">
          <h2 className="section-title mb-3"> <Text k="Your saved request" /> </h2>
          <Details draft={{ kind: "request", data: saved.request }} />
          {saved.selectedWorkerId && (
            <Button asChild className="mt-4"><Link href={jobHref("customer", saved.id)}> <Text k="Open job conversation" /> </Link></Button>
          )}
          {preview && <p className="mt-3 text-sm text-muted"> <Text k="Live discovery is unavailable. Example profiles cannot receive requests." /> </p>}
        </Card>
      )}
      {query.request && !saved && <p className="mb-5 text-muted"> <Text k="This saved request is unavailable in this browser session." /> </p>}
      <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-bold"><SlidersHorizontal size={18} aria-hidden /> <Text k="Filters" /> </h2>
          <form method="get" action="/customer/workers" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {saved && <input type="hidden" name="request" value={saved.id} />}
            <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Service" /> <select className="form-select font-normal" name="trade" defaultValue={trade ?? ""}>
                <option value=""> <Text k="All services" /> </option>
                {trades.map((item) => <option key={item} value={item}><Label value={services[item].label} /></option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Neighbourhood" /> <select className="form-select font-normal" name="area" defaultValue={area}>
                {areas.map((item) => <option key={item} value={item}>{item} <Text k=", Islamabad" /> </option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold"> <Text k="Distance" /> <select className="form-select font-normal" name="radius" defaultValue={radius}>
                <option value="3"> <Text k="Within 3 km" /> </option>
                <option value="5"> <Text k="Within 5 km" /> </option>
              </select>
            </label>
            <Button className="self-end" type="submit"> <Text k="Apply filters" /> </Button>
          </form>
        </Card>
        <section aria-labelledby="results-heading">
          <h2 id="results-heading" className="section-title mb-4"><Text k="{count} workers within {radius} km of {area}" values={{count: workers.length, radius, area}} /></h2>
          {workers.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {workers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} action={
                  saved?.status === "open" && !saved.selectedWorkerId && !worker.example && worker.trade === saved.request.trade
                    ? <SelectWorker requestId={saved.id} workerId={worker.id} /> : undefined
                } />
              ))}
            </div>
          ) : (
            <EmptyState icon={SearchX} title={<Text k="No workers match these filters" />} description={<Text k="Try a wider distance, a different neighbourhood, or another service." />}>
              <Button asChild variant="outline"><Link href={reset}> <Text k="Reset filters" /> </Link></Button>
            </EmptyState>
          )}
        </section>
      </div>
    </>
  );
}
