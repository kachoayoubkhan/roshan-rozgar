import type { Metadata } from "next";
import { JobPage } from "@/components/jobs/job-page";

export const metadata: Metadata = { title: "Worker job details" };

export default async function WorkerJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobPage id={id} role="worker" />;
}
