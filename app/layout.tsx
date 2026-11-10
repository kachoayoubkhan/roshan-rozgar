import { Text } from "@/components/i18n/provider";
import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-naskh-arabic";
import { LanguageProvider } from "@/components/i18n/provider";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: { default: "Roshan Rozgar", template: "%s | Roshan Rozgar" },
  description: "A local marketplace for skilled trades and home repairs in Islamabad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ur" dir="rtl" suppressHydrationWarning>
      <body>
        <LanguageProvider>
        <a className="skip-link" href="#main"> <Text k="Skip to content" /> </a>
        <SiteNav />
        <main id="main" tabIndex={-1} className="container-page main-content">{children}</main>
        <footer className="container-page site-footer">
          <span>Roshan Rozgar</span><span> <Text k="Islamabad, Pakistan" /> </span>
        </footer>
      </LanguageProvider>
      </body>
    </html>
  );
}
