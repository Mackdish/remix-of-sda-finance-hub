import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Reports" description="Daily, weekly, monthly, quarterly and annual reports with PDF/Excel export." icon={<BarChart3 className="h-5 w-5" />} />
  ),
});