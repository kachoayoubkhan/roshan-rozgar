import { Label } from "@/components/i18n/provider";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({ icon: Icon, title, description, children }: {
  icon: LucideIcon;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-9 text-center sm:py-12">
      <span className="grid size-14 place-items-center rounded-2xl bg-mint text-deep"><Icon size={25} aria-hidden /></span>
      <h2 className="section-title">{typeof title === "string" ? <Label value={title} /> : title}</h2>
      <p className="max-w-md text-muted">{typeof description === "string" ? <Label value={description} /> : description}</p>
      {children && <div className="mt-2">{children}</div>}
    </Card>
  );
}
