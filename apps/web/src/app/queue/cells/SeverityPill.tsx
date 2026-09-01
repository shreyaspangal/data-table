import { Badge } from "@/components/ui/badge";
import type { QueueRow } from "../columns";

// Ordered least -> most alarming. shadcn's Badge has no dedicated "danger"
// scale, so "critical" gets a solid-red override on top of the destructive
// variant -- without it, "high" (solid black, the "default" variant) reads
// as more alarming than "critical" (light red text), which is backwards
// for a severity column whose entire job is to escalate visually.
const VARIANT: Record<
  QueueRow["severity"],
  "outline" | "secondary" | "destructive"
> = {
  low: "outline",
  medium: "secondary",
  high: "destructive",
  critical: "destructive",
};

export function SeverityPill({ severity }: { severity: QueueRow["severity"] }) {
  return (
    <Badge
      variant={VARIANT[severity]}
      className={
        severity === "critical" ? "bg-destructive text-white" : undefined
      }
    >
      {severity}
    </Badge>
  );
}
