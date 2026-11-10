import { Text, Label, DateText } from "@/components/i18n/provider";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { tradeNames } from "@/lib/intake/copy";
import { jobHref, jobStatus, type JobRole, type JobSummary } from "@/lib/jobs/schema";

export function JobList({ items, role }: { items: JobSummary[]; role: JobRole }) {
  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.id}>
          <Card className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-deep"><Label value={jobStatus(item.booking_status ?? item.status)} /></span>
              <span className="text-sm text-muted"><Label value={tradeNames[item.trade]} /> · {item.area}</span>
            </div>
            <Link className="flex min-h-11 items-center justify-between gap-3 font-semibold text-deep hover:underline" href={jobHref(role, item.id)}>
              <span className="min-w-0 wrap-break-word">{item.problem}</span><ArrowUpRight size={18} className="shrink-0" aria-hidden />
            </Link>
            {role === "customer" && <p className="text-sm text-muted"> <Text k="Worker" /> {item.worker}</p>}
            {item.scheduled_time && <p className="text-sm text-muted"><DateText value={item.scheduled_time} /> <Text k="PKT · Rs." /> {item.amount?.toLocaleString("en-PK")}</p>}
          </Card>
        </li>
      ))}
    </ul>
  );
}
