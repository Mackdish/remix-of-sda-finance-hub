import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Wallet } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({ meta: [{ title: "Expenses — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer"]}>
      <ComingSoon title="Expenses" description="Record church expenditures with vendor, category and approval details." icon={<Wallet className="h-5 w-5" />} />
    </RoleGate>
  ),
});