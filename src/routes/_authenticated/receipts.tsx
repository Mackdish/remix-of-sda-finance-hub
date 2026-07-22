import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Receipt } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({ meta: [{ title: "Receipts — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer"]}>
      <ComingSoon title="Receipts" description="Record and print sequentially numbered receipts for every offering and donation." icon={<Receipt className="h-5 w-5" />} />
    </RoleGate>
  ),
});