import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/monthly-statement")({
  head: () => ({ meta: [{ title: "Monthly Statement — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Monthly Cash Statement" description="Auto-generated monthly summary with opening/closing balances." icon={<FileText className="h-5 w-5" />} />
  ),
});