import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { ExpensesPage } from "@/features/expenses/expenses-page";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer", "elder"]}>
      <ExpensesPage />
    </RoleGate>
  ),
});