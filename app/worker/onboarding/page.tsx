import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardList, UserRound } from "lucide-react";
import { VoiceIntake } from "@/components/intake/voice-intake";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWorker } from "@/lib/intake/store";

export const metadata: Metadata = { title: "Worker onboarding" };

const steps = [
  { title: "Introduce yourself", detail: "Say your name, trade and years of experience.", icon: UserRound },
  { title: "Tell us where you work", detail: "Share your area and usual visit charge, if you have one.", icon: ClipboardList },
  { title: "Confirm your profile", detail: "Hear your details in Urdu. Correct or confirm them before saving.", icon: BadgeCheck },
];

export default async function Onboarding() {
  const result = await getWorker().then((saved) => ({ saved, unavailable: false }), () => ({ saved: null, unavailable: true }));
  const { saved, unavailable } = result;
  return (
    <>
      <div className="mb-6 sm:mb-8">
        <p className="mb-2 text-sm font-semibold text-deep">Worker onboarding</p>
        <h1 className="page-title">{saved ? "Update your worker profile" : "Apni maloomat awaz mein batayein"}</h1>
        <p className="mt-3 w-fit text-lg text-muted" lang="ur" dir="rtl">اپنی معلومات آواز میں بتائیں</p>
        {unavailable && <p className="mt-3 text-sm text-muted">Saved profiles are temporarily unavailable. You can prepare a draft and retry after setup.</p>}
        {saved && <p className="mt-3 text-muted">Say what has changed or edit the details. Your saved profile updates only after you confirm.</p>}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <VoiceIntake kind="worker" initial={saved ? { kind: "worker", data: saved.profile } : undefined} version={saved?.version} />
        <Card>
          <h2 className="section-title">How voice onboarding works</h2>
          <ol className="mt-5 grid gap-5">
            {steps.map(({ title, detail, icon: Icon }) => (
              <li className="flex gap-3" key={title}>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-deep"><Icon size={20} aria-hidden /></span>
                <div><h3 className="font-bold">{title}</h3><p className="text-sm text-muted">{detail}</p></div>
              </li>
            ))}
          </ol>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/worker/home">{saved ? "View saved profile" : "Explore dashboard"} <ArrowRight aria-hidden /></Link>
          </Button>
        </Card>
      </div>
    </>
  );
}
