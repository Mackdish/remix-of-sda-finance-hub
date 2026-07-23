import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { RemittancePage } from "@/features/remittance/remittance-page";

export const Route = createFileRoute("/_authenticated/remittance")({
  head: () => ({ meta: [{ title: "Conference Remittance — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer"]}>
      <RemittancePage />
    </RoleGate>
  ),
});