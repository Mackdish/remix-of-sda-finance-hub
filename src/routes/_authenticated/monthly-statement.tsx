import { createFileRoute } from "@tanstack/react-router";
import { MonthlyStatementPage } from "@/features/statements/monthly-statement-page";

export const Route = createFileRoute("/_authenticated/monthly-statement")({
  head: () => ({ meta: [{ title: "Monthly Statement — SDA Treasurer" }] }),
  component: MonthlyStatementPage,
});