import { createFileRoute } from "@tanstack/react-router";
import { WeeklyReportPage } from "@/features/statements/weekly-report-page";

export const Route = createFileRoute("/_authenticated/weekly-report")({
  head: () => ({ meta: [{ title: "Weekly Report — SDA Treasurer" }] }),
  component: WeeklyReportPage,
});