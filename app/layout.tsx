import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";

export const metadata: Metadata = {
  title: { default: "Roshan Rozgar", template: "%s | Roshan Rozgar" },
  description: "A local marketplace for skilled trades and home repairs in Islamabad.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        <SiteNav />
        <main id="main" tabIndex={-1} className="container-page main-content">{children}</main>
        <footer className="container-page site-footer">
          <span>Roshan Rozgar</span><span>Islamabad, Pakistan</span>
        </footer>
      </body>
    </html>
  );
}
