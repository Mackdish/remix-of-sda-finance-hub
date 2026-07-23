import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { AdminPage } from "@/features/admin/admin-page";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin"]}>
      <AdminPage />
    </RoleGate>
  ),
});