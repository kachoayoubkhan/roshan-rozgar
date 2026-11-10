import type { Metadata } from "next";
import { JobPage } from "@/components/jobs/job-page";

export const metadata: Metadata = { title: "Job conversation" };

export default async function CustomerJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobPage id={id} role="customer" />;
}
