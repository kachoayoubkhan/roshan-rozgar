import { PreferenceText } from "@/components/i18n/preference";
import { Text, Label } from "@/components/i18n/provider";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, CircleDot, MapPin, Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { DemoLabel } from "@/components/marketplace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Details } from "@/components/intake/details";
import { AvailabilityControl } from "@/components/jobs/actions";
import { JobList } from "@/components/jobs/job-list";
import { RefreshJobs } from "@/components/jobs/refresh";
import { getWorker } from "@/lib/intake/store";
import { listJobs, workerBookable } from "@/lib/jobs/store";

export const metadata: Metadata = { title: "Worker dashboard" };

export default async function WorkerHome() {
  const { worker, unavailable } = await getWorker().then((worker) => ({ worker, unavailable: false }), () => ({ worker: null, unavailable: true }));
  const marketplace = worker ? await Promise.all([listJobs("worker"), workerBookable()])
    .then(([jobs, bookable]) => ({ jobs, bookable })).catch(() => null) : null;
  const active = marketplace?.jobs.filter((job) => job.booking_status === "confirmed" || job.booking_status === "in_progress") ?? [];
  const incoming = marketplace?.jobs.filter((job) => !job.booking_id && !["declined", "cancelled"].includes(job.status)) ?? [];
  const history = marketplace?.jobs.filter((job) => ["completed", "cancelled"].includes(job.booking_status ?? job.status) || job.status === "declined") ?? [];

  return (
    <>
      {worker && <RefreshJobs />}
      <div className="mb-6 sm:mb-8">
        {!worker && <DemoLabel />}
        <h1 className="page-title mt-3 wrap-break-word"> <Text k="Salam," /> {worker?.profile.name ?? "Ali Raza"}!</h1>
        <p className="mt-3 text-muted"><Label value={worker ? "Manage your availability, requests and bookings." : "Preview how workers will see their profile and incoming jobs."} /></p>
        {unavailable && <p className="mt-2 text-muted"> <Text k="Your saved profile is temporarily unavailable. The example below is demo data." /> </p>}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card>
          {worker ? (
            <>
              <h2 className="section-title mb-4"> <Text k="Saved profile" /> </h2>
              <Details draft={{ kind: "worker", data: worker.profile }} />
              <div className="mt-4 grid gap-1 rounded-xl border border-line bg-white p-4">
                <p className="flex items-center gap-2 font-semibold text-deep">
                  <Star size={16} className="fill-amber-400 text-amber-700" aria-hidden />
                  {worker.rating ? <Text k="{rating} average" values={{rating: worker.rating}} /> : <Text k="No reviews yet" />}
                </p>
                <p className="text-sm text-muted">
                  <Text k={worker.example ? "{count} demo reviews" : "{count} reviews"} values={{count: worker.reviewCount}} />
                  {worker.completedJobs > 0 && <> · <Text k="{count} completed jobs" values={{count: worker.completedJobs}} /></>}
                </p>
              </div>
              <div className="mt-4 grid gap-2 rounded-xl bg-mint p-4">
                <p className="flex items-center gap-2 font-semibold text-deep">
                  <CircleDot size={16} aria-hidden /><Label value={marketplace ? active.length ? "Busy with a booking" : marketplace.bookable ? "Available for work" : "Offline" : "Availability unavailable"} />
                </p>
                <p className="text-sm text-muted"> <PreferenceText online={worker.online} /> </p>
                <AvailabilityControl online={worker.online} key={String(worker.online)} />
              </div>
            </>
          ) : (
            <>
              <h2 className="section-title"> <Text k="Demo profile" /> </h2>
              <p className="mt-3 font-semibold"> <Text k="Plumber" /> </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} aria-hidden /> <Text k="G-11, Islamabad" /> </p>
            </>
          )}
          <Button asChild variant="outline" className="mt-4"><Link href="/worker/onboarding"><ArrowLeft aria-hidden /><Label value={worker ? "Update profile" : "Back to onboarding"} /></Link></Button>
        </Card>
        <div className="grid min-w-0 gap-5">
          {worker && !marketplace && <p className="rounded-xl border border-line bg-white p-4 text-muted"> <Text k="Jobs are temporarily unavailable. This page refreshes automatically." /> </p>}
          {active.length > 0 && <section aria-labelledby="active-jobs"><h2 id="active-jobs" className="section-title mb-3"> <Text k="Current booking" /> </h2><JobList items={active} role="worker" /></section>}
          {incoming.length > 0 ? (
            <section aria-labelledby="incoming-jobs"><h2 id="incoming-jobs" className="section-title mb-3"> <Text k="Incoming requests and quotes" /> </h2><JobList items={incoming} role="worker" /></section>
          ) : marketplace || !worker ? (
            <EmptyState icon={BriefcaseBusiness} title={<Text k="No incoming jobs" />} description={worker ? "New requests appear here when a customer chooses you." : "Save your profile and go online to receive requests."} />
          ) : null}
          {history.length > 0 && <section aria-labelledby="worker-history"><h2 id="worker-history" className="section-title mb-3"> <Text k="Job history" /> </h2><JobList items={history} role="worker" /></section>}
        </div>
      </div>
    </>
  );
}
