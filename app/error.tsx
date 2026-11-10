"use client";

import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <div role="alert">
      <h1 className="sr-only">Page error</h1>
      <EmptyState icon={TriangleAlert} title="This page didn’t load" description="Try loading the page again.">
        <Button type="button" onClick={reset}>Try again</Button>
      </EmptyState>
    </div>
  );
}
