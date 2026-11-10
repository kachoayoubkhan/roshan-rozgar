import { notFound } from "next/navigation";
import { z } from "zod";
import { readSession } from "@/lib/intake/session";
import { loadJob } from "@/lib/jobs/store";
import type { JobRole } from "@/lib/jobs/schema";
import { JobConsole } from "./job-console";

export async function JobPage({ id, role }: { id: string; role: JobRole }) {
  const parsed = z.uuid().safeParse(id);
  const actor = await readSession();
  if (!actor || !parsed.success) notFound();
  const job = await loadJob(actor, parsed.data);
  if (!job || job.role !== role) notFound();
  return <JobConsole initial={job} key={job.id} />;
}
