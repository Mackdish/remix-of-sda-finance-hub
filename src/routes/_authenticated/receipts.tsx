import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { ReceiptsPage } from "@/features/receipts/receipts-page";

export const Route = createFileRoute("/_authenticated/receipts")({
  head: () => ({ meta: [{ title: "Receipts — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer"]}>
      <ReceiptsPage />
    </RoleGate>
  ),
});