import { Text, Label } from "@/components/i18n/provider";
import Link from "next/link";
import { ArrowRight, HardHat, House, MapPin } from "lucide-react";
import { Neighborhood } from "@/components/neighborhood";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const roles = [
  {
    title: "Main Hunarmand Hoon", label: "For workers", description: "Start your worker profile.",
    action: "Continue as worker", href: "/worker/onboarding", icon: HardHat,
  },
  {
    title: "Mujhe Hunarmand Chahiye", label: "For customers", description: "Find a skilled worker near you.",
    action: "Continue as customer", href: "/customer/home", icon: House,
  },
];

export default function Welcome() {
  return (
    <>
      <section className="hero" aria-labelledby="welcome-heading">
        <div className="hero-copy">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-deep"><MapPin size={16} aria-hidden /> <Text k="Made for Islamabad" /> </p>
          <h1 id="welcome-heading" className="page-title"> <Text k="Skilled hands." /> <br /> <Text k="Close to home." /> </h1>
          <p className="mt-3 max-w-md text-muted sm:mt-4 sm:text-lg"> <Text k="Ghar ke kaam ke liye qareebi hunarmand." /> </p>
        </div>
        <Neighborhood />
      </section>
      <section className="mt-5 sm:mt-8" aria-labelledby="role-heading">
        <h2 id="role-heading" className="section-title mb-3 sm:mb-4"> <Text k="How would you like to start?" /> </h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-5">
          {roles.map(({ title, label, description, action, href, icon: Icon }) => (
            <Card className="flex flex-col gap-3 p-4 sm:gap-5" key={href}>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-deep sm:size-14"><Icon size={23} aria-hidden /></span>
                <div>
                  <p className="text-sm font-semibold text-muted"><Label value={label} /></p>
                  <h3 className="font-bold tracking-tight sm:text-xl"><Label value={title} /></h3>
                  <p className="mt-1 hidden text-sm text-muted sm:block"><Label value={description} /></p>
                </div>
              </div>
              <Button asChild className="w-full sm:w-fit" variant={href.startsWith("/worker") ? "outline" : "primary"}>
                <Link href={href}><Label value={action} /><ArrowRight aria-hidden /></Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
