import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Settings2 } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin"]}>
      <ComingSoon title="Administration" description="Manage churches, districts, users, roles, offering categories and financial years." icon={<Settings2 className="h-5 w-5" />} />
    </RoleGate>
  ),
});