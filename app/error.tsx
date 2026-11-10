"use client";

import { Text } from "@/components/i18n/provider";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function RouteError({ reset }: { reset: () => void }) {
  return (
    <div role="alert">
      <h1 className="sr-only"> <Text k="Page error" /> </h1>
      <EmptyState icon={TriangleAlert} title={<Text k="This page didn’t load" />} description={<Text k="Try loading the page again." />}>
        <Button type="button" onClick={reset}> <Text k="Try again" /> </Button>
      </EmptyState>
    </div>
  );
}
