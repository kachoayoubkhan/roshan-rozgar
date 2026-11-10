import { Text } from "@/components/i18n/provider";
import { Card } from "@/components/ui/card";

export default function LoadingWorkers() {
  return <Card role="status" className="text-muted"> <Text k="Finding nearby demo workers…" /> </Card>;
}
