import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { ApprovalsPage } from "@/features/approvals/approvals-page";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({ meta: [{ title: "Approvals — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin"]}>
      <ApprovalsPage />
    </RoleGate>
  ),
});