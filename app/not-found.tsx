import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <h1 className="sr-only">Page not found</h1>
      <EmptyState icon={MapPinOff} title="We couldn’t find that page" description="Go back to the welcome page to choose a worker or customer view.">
        <Button asChild><Link href="/">Go to welcome page</Link></Button>
      </EmptyState>
    </>
  );
}
