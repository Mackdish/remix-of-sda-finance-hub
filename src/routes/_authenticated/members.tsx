import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { Users } from "lucide-react";
import { RoleGate } from "@/components/role-gate";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer"]}>
      <ComingSoon title="Members" description="Maintain member details for quick receipt entry and contribution history." icon={<Users className="h-5 w-5" />} />
    </RoleGate>
  ),
});