import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { MembersPage } from "@/features/members/members-page";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Members — SDA Treasurer" }] }),
  component: () => (
    <RoleGate allow={["admin", "treasurer", "elder"]}>
      <MembersPage />
    </RoleGate>
  ),
});