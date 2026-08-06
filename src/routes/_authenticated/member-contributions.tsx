import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { MemberContributionsPage } from "@/features/members/member-contributions-page";

export const Route = createFileRoute("/_authenticated/member-contributions")({
  head: () => ({
    meta: [
      { title: "Member Contributions — SDA Treasurer" },
      { name: "description", content: "Rank member giving and report each member's contributions per offering category." },
    ],
  }),
  component: () => (
    <RoleGate allow={["admin", "treasurer", "auditor"]}>
      <MemberContributionsPage />
    </RoleGate>
  ),
});
