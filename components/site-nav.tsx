"use client";

import { Text, Label, useI18n } from "@/components/i18n/provider";
import Link from "next/link";
import { useEffect } from "react";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, BriefcaseBusiness, CalendarDays, HardHat, House, MapPin, Mic, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const customerLinks = [
  { href: "/customer/home", label: "Home", icon: House },
  { href: "/customer/workers", label: "Find workers", icon: Search },
  { href: "/customer/bookings", label: "Bookings", icon: CalendarDays },
];

const workerLinks = [
  { href: "/worker/onboarding", label: "Onboarding", icon: Mic },
  { href: "/worker/home", label: "Dashboard", icon: BriefcaseBusiness },
];

export function SiteNav() {
  const { label, language } = useI18n();
  const pathname = usePathname();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Roshan Rozgar", "/customer/home": "Customer home", "/customer/request": "Describe your job",
      "/customer/workers": "Find workers", "/customer/bookings": "My bookings",
      "/worker/home": "Worker dashboard", "/worker/onboarding": "Worker onboarding",
    };
    const title = titles[pathname] ?? (pathname.startsWith("/worker/") ? "Worker job details" : "Job conversation");
    document.title = title === "Roshan Rozgar" ? title : label(title) + " | Roshan Rozgar";
  }, [pathname, language, label]);
  const worker = pathname.startsWith("/worker/");
  const landing = pathname === "/";
  const links = worker ? workerLinks : customerLinks;
  const switchTo = worker ? "/customer/home" : "/worker/onboarding";
  const switchLabel = worker ? "Customer" : "Worker";

  return (
    <>
      <header className="site-header">
        <div className="container-page header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark"><HardHat size={22} aria-hidden /></span>
            <span>Roshan Rozgar</span>
          </Link>
          {!landing && (
            <nav className="desktop-nav" aria-label={label("Main")}>
              {links.map(({ href, label }) => (
                <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}><Label value={label} /></Link>
              ))}
            </nav>
          )}
          <LanguageSwitcher />
          {landing ? (
            <span className="location"><MapPin size={15} aria-hidden /><span> <Text k="Islamabad" /> </span></span>
          ) : (
            <Link className="role-switch" href={switchTo} aria-label={label(`Switch to ${switchLabel.toLowerCase()} view`)}>
              <ArrowLeftRight size={16} aria-hidden /> <Label value={switchLabel} />
            </Link>
          )}
        </div>
      </header>
      {!landing && (
        <nav className={cn("mobile-nav", worker && "mobile-nav-worker")} aria-label={label("Main")}>
          {links.map(({ href, label, icon: Icon }) => (
            <Link href={href} key={href} aria-current={pathname === href ? "page" : undefined}>
              <Icon size={19} aria-hidden /><Label value={label} />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
