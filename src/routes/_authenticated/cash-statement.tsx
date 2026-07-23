import { createFileRoute } from "@tanstack/react-router";
import { CashStatementPage } from "@/features/statements/cash-statement-page";

export const Route = createFileRoute("/_authenticated/cash-statement")({
  head: () => ({ meta: [{ title: "Cash Statement — SDA Treasurer" }] }),
  component: CashStatementPage,
});