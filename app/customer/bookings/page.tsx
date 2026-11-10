import { Text } from "@/components/i18n/provider";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Search } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { JobList } from "@/components/jobs/job-list";
import { RefreshJobs } from "@/components/jobs/refresh";
import { listJobs } from "@/lib/jobs/store";

export const metadata: Metadata = { title: "My bookings" };

export default async function Bookings() {
  const jobs = await listJobs("customer").catch(() => null);
  const bookings = jobs?.filter(({ booking_id }) => booking_id) ?? [];
  const conversations = jobs?.filter(({ booking_id }) => !booking_id) ?? [];
  return (
    <>
      <RefreshJobs />
      <div className="mb-6 sm:mb-8">
        <h1 className="page-title"> <Text k="My bookings" /> </h1>
        <p className="mt-3 text-muted"> <Text k="Reopen conversations, review agreed prices and check confirmed jobs." /> </p>
      </div>
      {!jobs ? <p role="status" className="text-muted"> <Text k="Bookings are temporarily unavailable. Try again in a moment." /> </p> : !jobs.length ? (
        <EmptyState icon={CalendarDays} title={<Text k="No bookings to show" />} description={<Text k="Describe a job and choose an available worker to start a conversation." />}>
          <Button asChild><Link href="/customer/request"><Search aria-hidden /> <Text k="Describe a job" /> </Link></Button>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <section aria-labelledby="booking-history">
            <h2 id="booking-history" className="section-title mb-3"> <Text k="Booking history" /> </h2>
            {bookings.length ? <JobList items={bookings} role="customer" /> : <p className="text-muted"> <Text k="No confirmed jobs yet." /> </p>}
          </section>
          <section aria-labelledby="conversations">
            <h2 id="conversations" className="section-title mb-3"> <Text k="Requests and conversations" /> </h2>
            {conversations.length ? <JobList items={conversations} role="customer" /> : <p className="text-muted"> <Text k="No other conversations." /> </p>}
          </section>
        </div>
      )}
    </>
  );
}
