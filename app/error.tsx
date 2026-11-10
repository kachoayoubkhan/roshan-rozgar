"use client";

import Link from "next/link";
import { Text } from "@/components/i18n/provider";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function RouteError() {
  return (
    <div role="alert">
      <h1 className="sr-only"> <Text k="Page error" /> </h1>
      <EmptyState icon={TriangleAlert} title={<Text k="This page didn’t load" />} description={<Text k="Try loading the page again." />}>
        <div className="flex flex-wrap justify-center gap-3">
          <Button type="button" onClick={() => window.location.reload()}><Text k="Try again" /></Button>
          <Button asChild variant="outline"><Link href="/"><Text k="Go to welcome page" /></Link></Button>
        </div>
      </EmptyState>
    </div>
  );
}
