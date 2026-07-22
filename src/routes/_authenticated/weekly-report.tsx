import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/weekly-report")({
  head: () => ({ meta: [{ title: "Weekly Report — SDA Treasurer" }] }),
  component: () => (
    <ComingSoon title="Weekly Cash Count & Offerings" description="Weeks One to Five with automatic totals and summaries." icon={<CalendarDays className="h-5 w-5" />} />
  ),
});