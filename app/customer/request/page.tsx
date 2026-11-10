import type { Metadata } from "next";
import Link from "next/link";
import { VoiceIntake } from "@/components/intake/voice-intake";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getRequest } from "@/lib/intake/store";

export const metadata: Metadata = { title: "Describe your job" };

export default async function RequestPage() {
  const latest = await getRequest().then((request) => ({ request, unavailable: false }), () => ({ request: null, unavailable: true }));
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-semibold text-deep">Service request</p>
        <h1 className="page-title">Kis kaam ke liye hunarmand chahiye?</h1>
        <p className="mt-3 text-muted">Tell us what needs fixing. We’ll use your confirmed details to find matching workers.</p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <VoiceIntake kind="request" />
        <Card className="grid gap-3">
          <h2 className="section-title">What happens next?</h2>
          <p className="text-muted">Review the details before saving. Discovery uses your service and neighbourhood to find nearby available workers.</p>
          {latest.request && (
            <Button asChild variant="outline" className="w-fit">
              <Link href={`/customer/workers?request=${latest.request.id}`}>Open latest saved request</Link>
            </Button>
          )}
          {latest.unavailable && <p className="text-sm text-muted">Saved requests are temporarily unavailable.</p>}
          <Button asChild variant="outline" className="w-fit"><Link href="/customer/workers">Browse without a request</Link></Button>
        </Card>
      </div>
    </>
  );
}
