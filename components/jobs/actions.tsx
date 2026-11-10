"use client";

import { Label, ErrorText } from "@/components/i18n/provider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jobHref, type JobAction } from "@/lib/jobs/schema";

export async function sendJobAction(action: JobAction) {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(typeof result?.error === "string" ? result.error : "Could not save this change. Try again.");
  }
}

export function SelectWorker({ requestId, workerId }: { requestId: string; workerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function select() {
    setBusy(true);
    setError("");
    try {
      await sendJobAction({ action: "select", requestId, workerId });
      router.push(jobHref("customer", requestId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not select this worker.");
      setBusy(false);
    }
  }
  return (
    <div className="grid gap-2">
      <Button type="button" className="w-full" disabled={busy} onClick={() => void select()}>
        {busy ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
        <Label value={busy ? "Opening conversation…" : "Request this worker"} />
      </Button>
      {error && <p className="text-sm text-red-800" role="alert">{error && <ErrorText message={error} />}</p>}
    </div>
  );
}

export function AvailabilityControl({ online }: { online: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<boolean>();
  const [error, setError] = useState("");
  const current = saved ?? online;
  async function change() {
    setPending(true);
    setError("");
    try {
      await sendJobAction({ action: "availability", online: !current });
      setSaved(!current);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update availability.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" className="w-fit" disabled={pending} onClick={() => void change()}>
        <Label value={pending ? "Saving…" : current ? "Go offline" : "Go online"} />
      </Button>
      {error && <p className="text-sm text-red-800" role="alert">{error && <ErrorText message={error} />}</p>}
    </div>
  );
}
