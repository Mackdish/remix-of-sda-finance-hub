import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { DepartmentsPage } from "@/features/departments/departments-page";

export const Route = createFileRoute("/_authenticated/departments")({
  head: () => ({
    meta: [
      { title: "Departments — SDA Treasurer" },
      { name: "description", content: "Manage church departments and report on their contributions and spending." },
    ],
  }),
  component: () => (
    <RoleGate allow={["admin", "treasurer", "elder", "pastor", "auditor"]}>
      <DepartmentsPage />
    </RoleGate>
  ),
});
